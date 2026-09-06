import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import postgres from "postgres";

const execFileAsync = promisify(execFile);
const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  console.log("[db:v7] DATABASE_URL not configured; skipping migration.");
  process.exit(0);
}

const VERSION = "7";
const LOCK_KEY = 724325207;
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
  if (version === VERSION || version === "6") return;
  console.log(`[db:v7] v6 foundation required from ${version ?? "none"}`);
  const { stdout, stderr } = await execFileAsync(process.execPath, ["scripts/migrate-v6-moments.mjs"], {
    cwd: root,
    env: process.env,
    timeout: 90000
  });
  if (stdout.trim()) console.log(stdout.trim());
  if (stderr.trim()) console.warn(stderr.trim());
}

async function upsertMoment(tx, moment) {
  const rows = await tx`
    insert into entities (entity_type, slug, display_name, start_date, metadata)
    values ('moment', ${moment.slug}, ${moment.title}, ${moment.date}, ${tx.json({ ...moment, subtitle: `${moment.date}${moment.opponent ? ` · vs. ${moment.opponent}` : ""}` })})
    on conflict (slug) do update set entity_type = 'moment', display_name = excluded.display_name, start_date = excluded.start_date, metadata = excluded.metadata, updated_at = now()
    returning id
  `;
  const momentId = rows[0]?.id;
  if (!momentId) return;

  if (moment.sourceUrl) {
    await tx`
      insert into facts (entity_id, fact_key, fact_value, source_id, source_url, confidence, verified_at)
      values (${momentId}, 'moment_record', ${tx.json({ summary: moment.summary, playDetail: moment.playDetail ?? null, people: moment.people ?? [], tags: moment.tags })}, ${moment.sourceId ?? 'raiders-official'}, ${moment.sourceUrl}, 1.0, now())
      on conflict (entity_id, fact_key, source_url) do update set fact_value = excluded.fact_value, source_id = excluded.source_id, confidence = excluded.confidence, verified_at = now()
    `;
  }

  if (moment.gameSlug) {
    const gameRows = await tx`select id from entities where slug = ${moment.gameSlug} and entity_type = 'game' limit 1`;
    const gameId = gameRows[0]?.id;
    if (gameId) {
      await tx`
        insert into relations (from_entity_id, relation_type, to_entity_id, source_id, source_url)
        values (${momentId}, 'moment_of_game', ${gameId}, ${moment.sourceId ?? 'raiders-official'}, ${moment.sourceUrl})
        on conflict (from_entity_id, relation_type, to_entity_id) do nothing
      `;
    }
  }

  for (const person of moment.people ?? []) {
    const personRows = await tx`
      select id from entities
      where lower(display_name) = lower(${person}) and entity_type in ('player','coach','executive','person')
      order by case when metadata ->> 'collection' = 'Pro Football Hall of Fame' then 0 else 1 end
      limit 1
    `;
    const personId = personRows[0]?.id;
    if (personId) {
      await tx`
        insert into relations (from_entity_id, relation_type, to_entity_id, source_id, source_url)
        values (${momentId}, 'moment_person', ${personId}, ${moment.sourceId ?? 'raiders-official'}, ${moment.sourceUrl})
        on conflict (from_entity_id, relation_type, to_entity_id) do nothing
      `;
    }
  }
}

async function run() {
  await ensureFoundation();
  let lockHeld = false;
  try {
    await sql`select pg_advisory_lock(${LOCK_KEY})`;
    lockHeld = true;
    if (await schemaVersion() === VERSION) {
      console.log(`[db:v7] schema version ${VERSION} already current; migration skipped`);
      return;
    }

    const [classicGames, moments] = await Promise.all([
      fs.readFile(path.join(root, "data/classic-games.json"), "utf8").then(JSON.parse),
      fs.readFile(path.join(root, "data/moments.json"), "utf8").then(JSON.parse)
    ]);

    await sql.begin(async tx => {
      for (const game of classicGames) {
        const score = `${game.raidersScore}-${game.opponentScore}`;
        const rows = await tx`
          insert into entities (entity_type, slug, display_name, start_date, metadata)
          values ('game', ${game.slug}, ${`Raiders vs. ${game.opponent}`}, ${game.date}, ${tx.json({ ...game, subtitle: `${game.season} · ${game.round} · ${game.result} ${score}` })})
          on conflict (slug) do update set entity_type = 'game', display_name = excluded.display_name, start_date = excluded.start_date, metadata = excluded.metadata, updated_at = now()
          returning id
        `;
        const gameId = rows[0]?.id;
        if (!gameId) continue;

        await tx`
          insert into facts (entity_id, fact_key, fact_value, source_id, source_url, confidence, verified_at)
          values (${gameId}, 'game_result', ${tx.json({ season: game.season, date: game.date, round: game.round, opponent: game.opponent, result: game.result, raidersScore: game.raidersScore, opponentScore: game.opponentScore, site: game.site, overtime: game.overtime, nickname: game.nickname })}, ${game.sourceId}, ${game.sourceUrl}, 1.0, now())
          on conflict (entity_id, fact_key, source_url) do update set fact_value = excluded.fact_value, source_id = excluded.source_id, confidence = excluded.confidence, verified_at = now()
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
      }

      for (const moment of moments) await upsertMoment(tx, moment);

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
        (select count(*)::int from entities where entity_type = 'game' and metadata ->> 'gameType' = 'regular-season-classic') as classic_games,
        (select count(*)::int from entities where entity_type = 'moment') as moments,
        (select count(*)::int from facts) as facts,
        (select count(*)::int from relations) as relations
    `;
    console.log('[db:v7] migration complete', counts[0]);
  } finally {
    if (lockHeld) {
      try { await sql`select pg_advisory_unlock(${LOCK_KEY})`; }
      catch (error) { console.warn('[db:v7] failed to release migration lock', error); }
    }
  }
}

try { await run(); }
finally { await sql.end({ timeout: 5 }); }
