import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import postgres from "postgres";

const execFileAsync = promisify(execFile);
const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  console.log("[db:v5] DATABASE_URL not configured; skipping migration.");
  process.exit(0);
}

const VERSION = "5";
const LOCK_KEY = 724325205;
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
  if (version === VERSION || version === "4") return version;
  console.log(`[db:v5] foundation migration required from ${version ?? "none"}`);
  const { stdout, stderr } = await execFileAsync(process.execPath, ["scripts/migrate-db.mjs"], {
    cwd: root,
    env: process.env,
    timeout: 60000
  });
  if (stdout.trim()) console.log(stdout.trim());
  if (stderr.trim()) console.warn(stderr.trim());
  return schemaVersion();
}

async function run() {
  await ensureFoundation();
  let lockHeld = false;
  try {
    await sql`select pg_advisory_lock(${LOCK_KEY})`;
    lockHeld = true;
    if (await schemaVersion() === VERSION) {
      console.log(`[db:v5] schema version ${VERSION} already current; migration skipped`);
      return;
    }

    const games = JSON.parse(await fs.readFile(path.join(root, "data/games.json"), "utf8"));
    await sql.begin(async tx => {
      for (const game of games) {
        const score = `${game.raidersScore}-${game.opponentScore}`;
        const rows = await tx`
          insert into entities (entity_type, slug, display_name, start_date, metadata)
          values ('game', ${game.slug}, ${`Raiders vs. ${game.opponent}`}, ${game.date}, ${tx.json({ ...game, gameType: "postseason", subtitle: `${game.season} · ${game.round} · ${game.result} ${score}${game.overtime ? " OT" : ""}` })})
          on conflict (slug) do update set
            display_name = excluded.display_name,
            start_date = excluded.start_date,
            metadata = excluded.metadata,
            updated_at = now()
          returning id
        `;
        const gameId = rows[0]?.id;
        if (!gameId) continue;

        await tx`
          insert into facts (entity_id, fact_key, fact_value, source_id, source_url, confidence, verified_at)
          values (${gameId}, 'game_result', ${tx.json({ season: game.season, date: game.date, round: game.round, opponent: game.opponent, result: game.result, raidersScore: game.raidersScore, opponentScore: game.opponentScore, site: game.site, overtime: game.overtime })}, ${game.sourceId}, ${game.sourceUrl}, 1.0, now())
          on conflict (entity_id, fact_key, source_url) do update set
            fact_value = excluded.fact_value,
            source_id = excluded.source_id,
            confidence = excluded.confidence,
            verified_at = now()
        `;

        const seasonRows = await tx`select id from entities where slug = ${`season-${game.season}`} limit 1`;
        const seasonId = seasonRows[0]?.id;
        if (seasonId) {
          await tx`
            insert into relations (from_entity_id, relation_type, to_entity_id, source_id, source_url)
            values (${gameId}, 'game_of_season', ${seasonId}, ${game.sourceId}, ${game.sourceUrl})
            on conflict (from_entity_id, relation_type, to_entity_id) do nothing
          `;
        }

        const championshipRows = await tx`
          select id from entities
          where entity_type = 'championship' and start_date = ${game.date}
          limit 1
        `;
        const championshipId = championshipRows[0]?.id;
        if (championshipId) {
          await tx`
            insert into relations (from_entity_id, relation_type, to_entity_id, source_id, source_url)
            values (${gameId}, 'game_is_championship', ${championshipId}, ${game.sourceId}, ${game.sourceUrl})
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
        (select count(*)::int from entities where entity_type = 'game') as games,
        (select count(*)::int from facts) as facts,
        (select count(*)::int from relations) as relations
    `;
    console.log(`[db:v5] migration complete`, counts[0]);
  } finally {
    if (lockHeld) {
      try { await sql`select pg_advisory_unlock(${LOCK_KEY})`; }
      catch (error) { console.warn("[db:v5] failed to release migration lock", error); }
    }
  }
}

try { await run(); }
finally { await sql.end({ timeout: 5 }); }
