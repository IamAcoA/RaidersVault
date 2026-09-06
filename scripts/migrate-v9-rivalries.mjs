import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import postgres from "postgres";

const execFileAsync = promisify(execFile);
const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  console.log("[db:v9] DATABASE_URL not configured; skipping migration.");
  process.exit(0);
}

const VERSION = "9";
const LOCK_KEY = 724325209;
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
  if (version === VERSION || version === "8") return;
  console.log(`[db:v9] v8 foundation required from ${version ?? "none"}`);
  const { stdout, stderr } = await execFileAsync(process.execPath, ["scripts/migrate-v8-people.mjs"], {
    cwd: root,
    env: process.env,
    timeout: 90000
  });
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
      console.log(`[db:v9] schema version ${VERSION} already current; migration skipped`);
      return;
    }

    const rivalries = JSON.parse(await fs.readFile(path.join(root, "data/rivalries.json"), "utf8"));
    await sql.begin(async tx => {
      await tx`alter table entities drop constraint if exists entities_entity_type_check`;
      await tx`
        alter table entities add constraint entities_entity_type_check
        check (entity_type in ('person','player','coach','executive','season','game','moment','venue','artifact','era','championship','rivalry','event'))
      `;

      for (const rivalry of rivalries) {
        const rows = await tx`
          insert into entities (entity_type, slug, display_name, start_date, metadata)
          values ('rivalry', ${rivalry.slug}, ${`Raiders vs. ${rivalry.shortName}`}, ${`${rivalry.startYear}-01-01`}, ${tx.json({ ...rivalry, subtitle: rivalry.seriesRecord })})
          on conflict (slug) do update set
            entity_type = 'rivalry',
            display_name = excluded.display_name,
            start_date = excluded.start_date,
            metadata = excluded.metadata,
            updated_at = now()
          returning id
        `;
        const rivalryId = rows[0]?.id;
        if (!rivalryId) continue;

        await tx`
          insert into facts (entity_id, fact_key, fact_value, source_id, source_url, confidence, verified_at)
          values (${rivalryId}, 'series_record', ${tx.json({ record: rivalry.seriesRecord, postseasonRecord: rivalry.postseasonRecord ?? null, through: rivalry.seriesThrough })}, 'raiders-official', ${rivalry.sourceUrl}, 1.0, now())
          on conflict (entity_id, fact_key, source_url) do update set
            fact_value = excluded.fact_value,
            source_id = excluded.source_id,
            confidence = excluded.confidence,
            verified_at = now()
        `;

        const gameRows = await tx`
          select id
          from entities
          where entity_type = 'game'
            and metadata ->> 'opponent' = any(${rivalry.aliases})
        `;
        for (const game of gameRows) {
          await tx`
            insert into relations (from_entity_id, relation_type, to_entity_id, source_id, source_url)
            values (${rivalryId}, 'rivalry_game', ${game.id}, 'raiders-official', ${rivalry.sourceUrl})
            on conflict (from_entity_id, relation_type, to_entity_id) do nothing
          `;

          const momentRows = await tx`
            select r.from_entity_id as id
            from relations r
            join entities e on e.id = r.from_entity_id
            where r.relation_type = 'moment_of_game'
              and r.to_entity_id = ${game.id}
              and e.entity_type = 'moment'
          `;
          for (const moment of momentRows) {
            await tx`
              insert into relations (from_entity_id, relation_type, to_entity_id, source_id, source_url)
              values (${rivalryId}, 'rivalry_moment', ${moment.id}, 'raiders-official', ${rivalry.sourceUrl})
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
        (select count(*)::int from entities where entity_type = 'rivalry') as rivalries,
        (select count(*)::int from facts) as facts,
        (select count(*)::int from relations) as relations,
        (select count(*)::int from relations where relation_type = 'rivalry_game') as rivalry_games,
        (select count(*)::int from relations where relation_type = 'rivalry_moment') as rivalry_moments
    `;
    console.log('[db:v9] migration complete', counts[0]);
  } finally {
    if (lockHeld) {
      try { await sql`select pg_advisory_unlock(${LOCK_KEY})`; }
      catch (error) { console.warn('[db:v9] failed to release migration lock', error); }
    }
  }
}

try { await run(); }
finally { await sql.end({ timeout: 5 }); }
