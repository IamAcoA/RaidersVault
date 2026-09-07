import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import postgres from "postgres";

const execFileAsync = promisify(execFile);
const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  console.log("[db:v15] DATABASE_URL not configured; skipping migration.");
  process.exit(0);
}

const VERSION = "15";
const LOCK_KEY = 724325215;
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
  if (version === VERSION || version === "14") return;
  console.log(`[db:v15] v14 foundation required from ${version ?? "none"}`);
  const { stdout, stderr } = await execFileAsync(process.execPath, ["scripts/migrate-v14-records.mjs"], {
    cwd: root,
    env: process.env,
    timeout: 90000
  });
  if (stdout.trim()) console.log(stdout.trim());
  if (stderr.trim()) console.warn(stderr.trim());
}

function pickSlug(pick, collection) {
  const pickPart = pick.pick == null ? "historical" : `pick-${pick.pick}`;
  return `draft-${pick.year}-${collection}-${pickPart}-${slugify(pick.player)}`;
}

async function run() {
  await ensureFoundation();
  let lockHeld = false;
  try {
    await sql`select pg_advisory_lock(${LOCK_KEY})`;
    lockHeld = true;
    if (await schemaVersion() === VERSION) {
      console.log(`[db:v15] schema version ${VERSION} already current; migration skipped`);
      return;
    }

    const draft = JSON.parse(await fs.readFile(path.join(root, "data/draft-history.json"), "utf8"));
    const picks = [
      ...draft.currentClass.picks.map(pick => ({ ...pick, year: draft.currentClass.year, collection: "current-class", sourceUrl: draft.sourceUrl })),
      ...draft.hallOfFamePicks.map(pick => ({ ...pick, collection: "hall-of-fame", sourceUrl: draft.historySourceUrl }))
    ];

    await sql.begin(async tx => {
      await tx`alter table entities drop constraint if exists entities_entity_type_check`;
      await tx`alter table entities add constraint entities_entity_type_check check (entity_type in ('person','player','coach','executive','season','game','moment','venue','artifact','era','championship','rivalry','number','record','draft_pick','event'))`;

      for (const pick of picks) {
        const slug = pickSlug(pick, pick.collection);
        const displayName = `${pick.year} Draft · ${pick.player}`;
        const rows = await tx`
          insert into entities (entity_type, slug, display_name, start_date, metadata)
          values (
            'draft_pick',
            ${slug},
            ${displayName},
            ${`${pick.year}-01-01`},
            ${tx.json({
              year: pick.year,
              round: pick.round ?? null,
              pick: pick.pick ?? null,
              player: pick.player,
              position: pick.position ?? null,
              college: pick.college ?? null,
              note: pick.note ?? null,
              vaultSlug: pick.vaultSlug ?? null,
              collection: pick.collection,
              sourceLabel: pick.collection === 'hall-of-fame' ? draft.historySourceLabel : draft.sourceLabel,
              sourceUrl: pick.sourceUrl,
              href: `/draft#${slug}`,
              subtitle: pick.pick == null ? `${pick.year} · historical selection` : `${pick.year} · Round ${pick.round} · Pick ${pick.pick}`
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
            ${tx.json({ year: pick.year, round: pick.round ?? null, pick: pick.pick ?? null, player: pick.player, position: pick.position ?? null, college: pick.college ?? null, note: pick.note ?? null, collection: pick.collection })},
            'raiders-official',
            ${pick.sourceUrl},
            1.0,
            now()
          )
          on conflict (entity_id, fact_key, source_url) do update set
            fact_value = excluded.fact_value,
            source_id = excluded.source_id,
            confidence = excluded.confidence,
            verified_at = now()
        `;

        const seasonRows = await tx`select id from entities where entity_type = 'season' and slug = ${`season-${pick.year}`} limit 1`;
        if (seasonRows[0]?.id) {
          await tx`
            insert into relations (from_entity_id, relation_type, to_entity_id, source_id, source_url)
            values (${draftPickId}, 'draft_class_of_season', ${seasonRows[0].id}, 'raiders-official', ${pick.sourceUrl})
            on conflict (from_entity_id, relation_type, to_entity_id) do nothing
          `;
        }

        if (pick.vaultSlug) {
          const people = await tx`select id from entities where slug = ${pick.vaultSlug} limit 1`;
          if (people[0]?.id) {
            await tx`
              insert into relations (from_entity_id, relation_type, to_entity_id, source_id, source_url)
              values (${draftPickId}, 'drafted_player', ${people[0].id}, 'raiders-official', ${pick.sourceUrl})
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
        (select count(*)::int from entities where entity_type = 'draft_pick' and metadata ->> 'collection' = 'current-class') as current_class,
        (select count(*)::int from entities where entity_type = 'draft_pick' and metadata ->> 'collection' = 'hall-of-fame') as hall_of_fame_picks,
        (select count(*)::int from facts) as facts,
        (select count(*)::int from relations) as relations,
        (select count(*)::int from relations where relation_type = 'draft_class_of_season') as draft_season_links,
        (select count(*)::int from relations where relation_type = 'drafted_player') as drafted_player_links
    `;
    console.log('[db:v15] migration complete', counts[0]);
  } finally {
    if (lockHeld) {
      try { await sql`select pg_advisory_unlock(${LOCK_KEY})`; }
      catch (error) { console.warn('[db:v15] failed to release migration lock', error); }
    }
  }
}

try { await run(); }
finally { await sql.end({ timeout: 5 }); }
