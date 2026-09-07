import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import postgres from "postgres";

const execFileAsync = promisify(execFile);
const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  console.log("[db:v17] DATABASE_URL not configured; skipping migration.");
  process.exit(0);
}

const VERSION = "17";
const LOCK_KEY = 724325217;
const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, "..");
const sql = postgres(databaseUrl, { max: 1, connect_timeout: 15, prepare: false });
const slugify = value => String(value).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

async function schemaVersion() {
  const check = await sql`select to_regclass('public.app_meta')::text as app_meta`;
  if (!check[0]?.app_meta) return null;
  const rows = await sql`select value from app_meta where key = 'schema_version' limit 1`;
  return rows[0]?.value ? String(rows[0].value) : null;
}

async function ensureFoundation() {
  const version = await schemaVersion();
  if (version === VERSION || version === "16") return;
  console.log(`[db:v17] v16 foundation required from ${version ?? "none"}`);
  const { stdout, stderr } = await execFileAsync(process.execPath, ["scripts/migrate-v16-modern-draft.mjs"], { cwd: root, env: process.env, timeout: 90000 });
  if (stdout.trim()) console.log(stdout.trim());
  if (stderr.trim()) console.warn(stderr.trim());
}

async function run() {
  await ensureFoundation();
  let lockHeld = false;
  try {
    await sql`select pg_advisory_lock(${LOCK_KEY})`;
    lockHeld = true;
    if (await schemaVersion() === VERSION) {
      console.log(`[db:v17] schema version ${VERSION} already current; migration skipped`);
      return;
    }

    const archive = JSON.parse(await fs.readFile(path.join(root, "data/draft-2014-2019.json"), "utf8"));

    await sql.begin(async tx => {
      for (const draftYear of archive.years) {
        const year = Number(draftYear.year);
        for (const pick of draftYear.picks) {
          const slug = `draft-${year}-year-class-${String(pick.roundLabel ?? pick.round)}-${slugify(pick.player)}`;
          const rows = await tx`
            insert into entities (entity_type, slug, display_name, start_date, metadata)
            values (
              'draft_pick',
              ${slug},
              ${`${year} Draft · ${pick.player}`},
              ${`${year}-01-01`},
              ${tx.json({
                year,
                round: pick.round ?? null,
                roundLabel: pick.roundLabel ?? String(pick.round ?? ''),
                pick: null,
                player: pick.player,
                position: pick.position,
                college: pick.college,
                note: pick.note ?? null,
                collection: 'year-class',
                sourceLabel: archive.sourceLabel,
                sourceUrl: archive.sourceUrl,
                href: `/draft/${year}`,
                subtitle: `${year} · Round ${pick.roundLabel ?? pick.round}`
              })}
            )
            on conflict (slug) do update set
              entity_type = 'draft_pick',
              display_name = excluded.display_name,
              start_date = excluded.start_date,
              metadata = excluded.metadata,
              updated_at = now()
            returning id
          `;
          const draftPickId = rows[0]?.id;
          if (!draftPickId) continue;

          await tx`
            insert into facts (entity_id, fact_key, fact_value, source_id, source_url, confidence, verified_at)
            values (
              ${draftPickId},
              'draft_selection',
              ${tx.json({ year, round: pick.round ?? null, roundLabel: pick.roundLabel ?? String(pick.round ?? ''), pick: null, player: pick.player, position: pick.position, college: pick.college, note: pick.note ?? null, collection: 'year-class' })},
              'raiders-official',
              ${archive.sourceUrl},
              1.0,
              now()
            )
            on conflict (entity_id, fact_key, source_url) do update set
              fact_value = excluded.fact_value,
              confidence = excluded.confidence,
              verified_at = now()
          `;

          const seasons = await tx`select id from entities where entity_type = 'season' and slug = ${`season-${year}`} limit 1`;
          if (seasons[0]?.id) {
            await tx`
              insert into relations (from_entity_id, relation_type, to_entity_id, source_id, source_url)
              values (${draftPickId}, 'draft_class_of_season', ${seasons[0].id}, 'raiders-official', ${archive.sourceUrl})
              on conflict (from_entity_id, relation_type, to_entity_id) do nothing
            `;
          }
        }
      }

      await tx`
        insert into app_meta (key, value, updated_at)
        values ('schema_version', ${VERSION}, now())
        on conflict (key) do update set value = excluded.value, updated_at = now()
      `;
    });

    const counts = await sql`
      select
        (select count(*)::int from entities) as entities,
        (select count(*)::int from entities where entity_type = 'draft_pick') as draft_picks,
        (select count(*)::int from entities where entity_type = 'draft_pick' and (metadata ->> 'year')::int between 2014 and 2019) as draft_2014_2019,
        (select count(*)::int from facts) as facts,
        (select count(*)::int from relations) as relations,
        (select count(*)::int from relations where relation_type = 'draft_class_of_season') as draft_season_links
    `;
    console.log('[db:v17] migration complete', counts[0]);
  } finally {
    if (lockHeld) {
      try { await sql`select pg_advisory_unlock(${LOCK_KEY})`; } catch {}
    }
  }
}

try { await run(); }
finally { await sql.end({ timeout: 5 }); }
