import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import postgres from "postgres";

const execFileAsync = promisify(execFile);
const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  console.log("[db:v14] DATABASE_URL not configured; skipping migration.");
  process.exit(0);
}

const VERSION = "14";
const LOCK_KEY = 724325214;
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
  if (version === VERSION || version === "13") return;
  console.log(`[db:v14] v13 foundation required from ${version ?? "none"}`);
  const { stdout, stderr } = await execFileAsync(process.execPath, ["scripts/migrate-v13-battle-of-the-bay.mjs"], {
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
      console.log(`[db:v14] schema version ${VERSION} already current; migration skipped`);
      return;
    }

    const records = JSON.parse(await fs.readFile(path.join(root, "data/records.json"), "utf8"));

    await sql.begin(async tx => {
      await tx`alter table entities drop constraint if exists entities_entity_type_check`;
      await tx`alter table entities add constraint entities_entity_type_check check (entity_type in ('person','player','coach','executive','season','game','moment','venue','artifact','era','championship','rivalry','number','record','event'))`;

      await tx`
        insert into sources (id, name, homepage, source_type, trust, ingestion_method, copy_policy, metadata, enabled, updated_at)
        values ('pro-football-reference', 'Pro Football Reference', 'https://www.pro-football-reference.com/', 'reference', 5, 'metadata-only', 'link-only', ${tx.json({ purpose: 'franchise records and reference data' })}, true, now())
        on conflict (id) do update set
          name = excluded.name,
          homepage = excluded.homepage,
          source_type = excluded.source_type,
          trust = excluded.trust,
          ingestion_method = excluded.ingestion_method,
          copy_policy = excluded.copy_policy,
          metadata = excluded.metadata,
          enabled = true,
          updated_at = now()
      `;

      const snapshotRows = await tx`
        insert into entities (entity_type, slug, display_name, metadata)
        values (
          'record',
          'record-franchise-snapshot',
          'Raiders Franchise Snapshot',
          ${tx.json({
            title: 'Raiders Franchise Snapshot',
            stat: 'Franchise benchmarks',
            items: records.snapshot,
            sourceLabel: records.snapshotSourceLabel,
            sourceUrl: records.snapshotSourceUrl,
            subtitle: 'Franchise benchmarks'
          })}
        )
        on conflict (slug) do update set
          entity_type = 'record',
          display_name = excluded.display_name,
          metadata = excluded.metadata,
          updated_at = now()
        returning id
      `;
      const snapshotId = snapshotRows[0]?.id;
      if (snapshotId) {
        await tx`
          insert into facts (entity_id, fact_key, fact_value, source_id, source_url, confidence, verified_at)
          values (${snapshotId}, 'franchise_snapshot', ${tx.json(records.snapshot)}, 'pro-football-reference', ${records.snapshotSourceUrl}, 1.0, now())
          on conflict (entity_id, fact_key, source_url) do update set
            fact_value = excluded.fact_value,
            source_id = excluded.source_id,
            confidence = excluded.confidence,
            verified_at = now()
        `;
        for (const item of records.snapshot) {
          if (!item.vaultSlug) continue;
          const people = await tx`select id from entities where slug = ${item.vaultSlug} limit 1`;
          if (!people[0]?.id) continue;
          await tx`
            insert into relations (from_entity_id, relation_type, to_entity_id, source_id, source_url)
            values (${snapshotId}, 'record_leader', ${people[0].id}, 'pro-football-reference', ${records.snapshotSourceUrl})
            on conflict (from_entity_id, relation_type, to_entity_id) do nothing
          `;
        }
      }

      for (const category of records.categories) {
        const rows = await tx`
          insert into entities (entity_type, slug, display_name, metadata)
          values (
            'record',
            ${`record-${category.slug}`},
            ${category.title},
            ${tx.json({
              title: category.title,
              stat: category.stat,
              note: category.note ?? null,
              leaders: category.leaders,
              sourceLabel: records.sourceLabel,
              sourceUrl: records.sourceUrl,
              subtitle: `${category.stat} · top 10`
            })}
          )
          on conflict (slug) do update set
            entity_type = 'record',
            display_name = excluded.display_name,
            metadata = excluded.metadata,
            updated_at = now()
          returning id
        `;
        const recordId = rows[0]?.id;
        if (!recordId) continue;

        await tx`
          insert into facts (entity_id, fact_key, fact_value, source_id, source_url, confidence, verified_at)
          values (${recordId}, 'career_leaderboard', ${tx.json(category.leaders)}, 'raiders-official', ${records.sourceUrl}, 1.0, now())
          on conflict (entity_id, fact_key, source_url) do update set
            fact_value = excluded.fact_value,
            source_id = excluded.source_id,
            confidence = excluded.confidence,
            verified_at = now()
        `;

        for (const leader of category.leaders) {
          if (!leader.vaultSlug) continue;
          const people = await tx`select id from entities where slug = ${leader.vaultSlug} limit 1`;
          if (!people[0]?.id) continue;
          await tx`
            insert into relations (from_entity_id, relation_type, to_entity_id, source_id, source_url)
            values (${recordId}, 'record_leader', ${people[0].id}, 'raiders-official', ${records.sourceUrl})
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
        (select count(*)::int from entities where entity_type = 'record') as records,
        (select count(*)::int from facts) as facts,
        (select count(*)::int from relations) as relations,
        (select count(*)::int from relations where relation_type = 'record_leader') as record_leader_links
    `;
    console.log('[db:v14] migration complete', counts[0]);
  } finally {
    if (lockHeld) {
      try { await sql`select pg_advisory_unlock(${LOCK_KEY})`; }
      catch (error) { console.warn('[db:v14] failed to release migration lock', error); }
    }
  }
}

try { await run(); }
finally { await sql.end({ timeout: 5 }); }
