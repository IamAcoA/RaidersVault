import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import postgres from "postgres";

const execFileAsync = promisify(execFile);
const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  console.log("[db:v11] DATABASE_URL not configured; skipping migration.");
  process.exit(0);
}

const VERSION = "11";
const LOCK_KEY = 724325211;
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
  if (version === VERSION || version === "10") return;
  console.log(`[db:v11] v10 foundation required from ${version ?? "none"}`);
  const { stdout, stderr } = await execFileAsync(process.execPath, ["scripts/migrate-v10-al-davis.mjs"], {
    cwd: root,
    env: process.env,
    timeout: 90000
  });
  if (stdout.trim()) console.log(stdout.trim());
  if (stderr.trim()) console.warn(stderr.trim());
}

async function allowNumberEntityType(tx) {
  await tx`alter table entities drop constraint if exists entities_entity_type_check`;
  await tx`
    alter table entities
    add constraint entities_entity_type_check
    check (entity_type in ('person','player','coach','executive','season','game','moment','venue','artifact','era','championship','rivalry','number','event'))
  `;
}

async function run() {
  await ensureFoundation();
  let lockHeld = false;
  try {
    await sql`select pg_advisory_lock(${LOCK_KEY})`;
    lockHeld = true;
    if (await schemaVersion() === VERSION) {
      console.log(`[db:v11] schema version ${VERSION} already current; migration skipped`);
      return;
    }

    const numbers = JSON.parse(await fs.readFile(path.join(root, "data/numbers.json"), "utf8"));
    await sql.begin(async tx => {
      await allowNumberEntityType(tx);

      for (const record of numbers) {
        const rows = await tx`
          insert into entities (entity_type, slug, display_name, metadata)
          values (
            'number',
            ${`number-${record.number}`},
            ${`Raiders #${record.number}`},
            ${tx.json({
              number: record.number,
              wearerCount: record.wearerCount,
              sourceChecked: record.sourceChecked,
              sourceLabel: record.sourceLabel,
              sourceUrl: record.sourceUrl,
              wearers: record.wearers,
              subtitle: `${record.wearerCount} documented Raiders`
            })}
          )
          on conflict (slug) do update set
            entity_type = 'number',
            display_name = excluded.display_name,
            metadata = excluded.metadata,
            updated_at = now()
          returning id
        `;
        const numberId = rows[0]?.id;
        if (!numberId) continue;

        await tx`
          insert into facts (entity_id, fact_key, fact_value, source_id, source_url, confidence, verified_at)
          values (
            ${numberId},
            'uniform_history',
            ${tx.json({ number: record.number, wearerCount: record.wearerCount, wearers: record.wearers, sourceChecked: record.sourceChecked })},
            'pro-football-reference',
            ${record.sourceUrl},
            1.0,
            now()
          )
          on conflict (entity_id, fact_key, source_url) do update set
            fact_value = excluded.fact_value,
            source_id = excluded.source_id,
            confidence = excluded.confidence,
            verified_at = now()
        `;

        for (const wearer of record.wearers) {
          if (!wearer.vaultSlug) continue;
          const targets = await tx`
            select id
            from entities
            where slug = ${wearer.vaultSlug}
            limit 1
          `;
          const target = targets[0];
          if (!target?.id) {
            console.warn(`[db:v11] unresolved Vault wearer ${wearer.vaultSlug}`);
            continue;
          }
          await tx`
            insert into relations (from_entity_id, relation_type, to_entity_id, source_id, source_url)
            values (${numberId}, 'number_worn_by', ${target.id}, 'pro-football-reference', ${record.sourceUrl})
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
        (select count(*)::int from entities where entity_type = 'number') as numbers,
        (select count(*)::int from facts) as facts,
        (select count(*)::int from relations) as relations,
        (select count(*)::int from relations where relation_type = 'number_worn_by') as number_person_links
    `;
    console.log('[db:v11] migration complete', counts[0]);
  } finally {
    if (lockHeld) {
      try { await sql`select pg_advisory_unlock(${LOCK_KEY})`; }
      catch (error) { console.warn('[db:v11] failed to release migration lock', error); }
    }
  }
}

try { await run(); }
finally { await sql.end({ timeout: 5 }); }
