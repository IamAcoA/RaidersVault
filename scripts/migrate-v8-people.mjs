import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import postgres from "postgres";

const execFileAsync = promisify(execFile);
const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  console.log("[db:v8] DATABASE_URL not configured; skipping migration.");
  process.exit(0);
}

const VERSION = "8";
const LOCK_KEY = 724325208;
const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, "..");
const sql = postgres(databaseUrl, { max: 1, connect_timeout: 15, prepare: false });

async function schemaVersion() {
  const check = await sql`select to_regclass('public.app_meta')::text as app_meta`;
  if (!check[0]?.app_meta) return null;
  const rows = await sql`select value from app_meta where key = 'schema_version' limit 1`;
  return rows[0]?.value ? String(rows[0].value) : null;
}

async function ensureFoundation() {
  const version = await schemaVersion();
  if (version === VERSION || version === "7") return;
  console.log(`[db:v8] v7 foundation required from ${version ?? "none"}`);
  const { stdout, stderr } = await execFileAsync(process.execPath, ["scripts/migrate-v7-classic-games.mjs"], {
    cwd: root,
    env: process.env,
    timeout: 90000
  });
  if (stdout.trim()) console.log(stdout.trim());
  if (stderr.trim()) console.warn(stderr.trim());
}

function relationType(label) {
  return `profile_${String(label).toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "")}`;
}

function yearsForRanges(ranges) {
  const years = new Set();
  for (const [start, end] of ranges ?? []) {
    for (let year = Number(start); year <= Number(end); year += 1) years.add(year);
  }
  return [...years].sort((a, b) => a - b);
}

async function run() {
  await ensureFoundation();
  let lockHeld = false;
  try {
    await sql`select pg_advisory_lock(${LOCK_KEY})`;
    lockHeld = true;
    if (await schemaVersion() === VERSION) {
      console.log(`[db:v8] schema version ${VERSION} already current; migration skipped`);
      return;
    }

    const profiles = JSON.parse(await fs.readFile(path.join(root, "data/people-profiles.json"), "utf8"));

    await sql.begin(async tx => {
      for (const profile of profiles) {
        const personRows = await tx`
          select id, entity_type, metadata
          from entities
          where slug = ${profile.slug}
          limit 1
        `;
        const person = personRows[0];
        if (!person?.id) {
          console.warn(`[db:v8] missing person entity ${profile.slug}; skipped`);
          continue;
        }

        const enriched = {
          ...profile,
          peopleProfile: true,
          hallOfFame: Boolean(person.metadata?.hallOfFame),
          collection: person.metadata?.collection ?? undefined,
          position: person.metadata?.position ?? undefined,
          years: person.metadata?.years ?? undefined,
          number: person.metadata?.number ?? undefined,
          distinction: person.metadata?.distinction ?? undefined
        };

        await tx`
          update entities
          set metadata = metadata || ${tx.json(enriched)}, updated_at = now()
          where id = ${person.id}
        `;

        await tx`
          insert into facts (entity_id, fact_key, fact_value, source_id, source_url, confidence, verified_at)
          values (${person.id}, 'people_profile', ${tx.json({ summary: profile.summary, raidersRoles: profile.raidersRoles, seasonRanges: profile.seasonRanges })}, ${profile.sourceLabel === 'Pro Football Hall of Fame' ? 'pro-football-hof' : 'raiders-official'}, ${profile.sourceUrl}, 1.0, now())
          on conflict (entity_id, fact_key, source_url) do update set
            fact_value = excluded.fact_value,
            source_id = excluded.source_id,
            confidence = excluded.confidence,
            verified_at = now()
        `;

        for (const year of yearsForRanges(profile.seasonRanges)) {
          const seasonRows = await tx`select id from entities where slug = ${`season-${year}`} and entity_type = 'season' limit 1`;
          const seasonId = seasonRows[0]?.id;
          if (!seasonId) continue;
          await tx`
            insert into relations (from_entity_id, relation_type, to_entity_id, source_id, source_url)
            values (${seasonId}, 'season_person', ${person.id}, ${profile.sourceLabel === 'Pro Football Hall of Fame' ? 'pro-football-hof' : 'raiders-official'}, ${profile.sourceUrl})
            on conflict (from_entity_id, relation_type, to_entity_id) do nothing
          `;
        }

        for (const connection of profile.connections ?? []) {
          const targetRows = await tx`
            select id from entities
            where slug = ${connection.slug} and entity_type = ${connection.type}
            limit 1
          `;
          const targetId = targetRows[0]?.id;
          if (!targetId) continue;

          if (connection.relation === 'Super Bowl MVP') {
            const existing = await tx`
              select 1 from relations
              where from_entity_id = ${targetId} and to_entity_id = ${person.id} and relation_type = 'championship_mvp'
              limit 1
            `;
            if (existing.length) continue;
          }

          await tx`
            insert into relations (from_entity_id, relation_type, to_entity_id, source_id, source_url)
            values (${targetId}, ${relationType(connection.relation)}, ${person.id}, ${profile.sourceLabel === 'Pro Football Hall of Fame' ? 'pro-football-hof' : 'raiders-official'}, ${profile.sourceUrl})
            on conflict (from_entity_id, relation_type, to_entity_id) do nothing
          `;
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
        (select count(*)::int from facts) as facts,
        (select count(*)::int from relations) as relations,
        (select count(*)::int from relations where relation_type = 'season_person') as season_people,
        (select count(*)::int from entities where metadata ->> 'peopleProfile' = 'true') as people_profiles
    `;
    console.log('[db:v8] migration complete', counts[0]);
  } finally {
    if (lockHeld) {
      try { await sql`select pg_advisory_unlock(${LOCK_KEY})`; }
      catch (error) { console.warn('[db:v8] failed to release migration lock', error); }
    }
  }
}

try { await run(); }
finally { await sql.end({ timeout: 5 }); }
