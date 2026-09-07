import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import postgres from "postgres";

const execFileAsync = promisify(execFile);
const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  console.log("[db:v13] DATABASE_URL not configured; skipping migration.");
  process.exit(0);
}

const VERSION = "13";
const LOCK_KEY = 724325213;
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
  if (version === VERSION || version === "12") return;
  console.log(`[db:v13] v12 foundation required from ${version ?? "none"}`);
  const { stdout, stderr } = await execFileAsync(process.execPath, ["scripts/migrate-v12-venues-eras.mjs"], {
    cwd: root,
    env: process.env,
    timeout: 90000
  });
  if (stdout.trim()) console.log(stdout.trim());
  if (stderr.trim()) console.warn(stderr.trim());
}

function venueCoversSeason(metadata, season) {
  const ranges = Array.isArray(metadata?.homeRanges) ? metadata.homeRanges : [];
  return ranges.some(range => season >= Number(range.start) && season <= Number(range.end));
}

async function run() {
  await ensureFoundation();
  let lockHeld = false;
  try {
    await sql`select pg_advisory_lock(${LOCK_KEY})`;
    lockHeld = true;
    if (await schemaVersion() === VERSION) {
      console.log(`[db:v13] schema version ${VERSION} already current; migration skipped`);
      return;
    }

    const rivalries = JSON.parse(await fs.readFile(path.join(root, "data/rivalries.json"), "utf8"));
    const rivalry = rivalries.find(item => item.slug === "san-francisco-49ers");
    const games = JSON.parse(await fs.readFile(path.join(root, "data/battle-of-the-bay-games.json"), "utf8"));
    if (!rivalry) throw new Error("Battle of the Bay rivalry record missing");

    await sql.begin(async tx => {
      const rivalryRows = await tx`
        insert into entities (entity_type, slug, display_name, start_date, metadata)
        values (
          'rivalry',
          ${rivalry.slug},
          ${rivalry.name},
          ${`${rivalry.startYear}-01-01`},
          ${tx.json({
            shortName: rivalry.shortName,
            kind: rivalry.kind,
            startYear: rivalry.startYear,
            seriesRecord: rivalry.seriesRecord,
            postseasonRecord: rivalry.postseasonRecord,
            seriesThrough: rivalry.seriesThrough,
            completeRegularSeasonLedger: true,
            summary: rivalry.summary,
            aliases: rivalry.aliases,
            sourceLabel: rivalry.sourceLabel,
            sourceUrl: rivalry.sourceUrl,
            historyUrl: rivalry.historyUrl,
            subtitle: rivalry.seriesRecord
          })}
        )
        on conflict (slug) do update set
          entity_type = 'rivalry',
          display_name = excluded.display_name,
          start_date = excluded.start_date,
          metadata = excluded.metadata,
          updated_at = now()
        returning id
      `;
      const rivalryId = rivalryRows[0]?.id;
      if (!rivalryId) throw new Error("Failed to upsert Battle of the Bay rivalry");

      await tx`
        insert into facts (entity_id, fact_key, fact_value, source_id, source_url, confidence, verified_at)
        values (
          ${rivalryId},
          'series_summary',
          ${tx.json({ seriesRecord: rivalry.seriesRecord, postseasonRecord: rivalry.postseasonRecord, meetings: 15, summary: rivalry.summary })},
          'raiders-official',
          ${rivalry.sourceUrl},
          1.0,
          now()
        )
        on conflict (entity_id, fact_key, source_url) do update set
          fact_value = excluded.fact_value,
          source_id = excluded.source_id,
          confidence = excluded.confidence,
          verified_at = now()
      `;

      const venues = await tx`select id, metadata from entities where entity_type = 'venue'`;

      for (const game of games) {
        const gameRows = await tx`
          insert into entities (entity_type, slug, display_name, start_date, metadata)
          values (
            'game',
            ${game.slug},
            ${game.nickname ?? `Raiders vs. ${game.opponent}`},
            ${game.date},
            ${tx.json({
              season: game.season,
              date: game.date,
              round: game.round,
              opponent: game.opponent,
              result: game.result,
              raidersScore: game.raidersScore,
              opponentScore: game.opponentScore,
              site: game.site,
              overtime: Boolean(game.overtime),
              gameType: game.gameType,
              nickname: game.nickname ?? null,
              sourceId: game.sourceId,
              sourceLabel: game.sourceLabel,
              sourceUrl: game.sourceUrl,
              subtitle: `${game.season} · Battle of the Bay · ${game.result} ${game.raidersScore}-${game.opponentScore}`
            })}
          )
          on conflict (slug) do update set
            entity_type = 'game',
            display_name = excluded.display_name,
            start_date = excluded.start_date,
            metadata = excluded.metadata,
            updated_at = now()
          returning id
        `;
        const gameId = gameRows[0]?.id;
        if (!gameId) continue;

        await tx`
          insert into facts (entity_id, fact_key, fact_value, source_id, source_url, confidence, verified_at)
          values (
            ${gameId},
            'battle_of_the_bay_result',
            ${tx.json({ season: game.season, date: game.date, result: game.result, raidersScore: game.raidersScore, opponentScore: game.opponentScore, site: game.site, overtime: Boolean(game.overtime) })},
            'raiders-official',
            ${game.sourceUrl},
            1.0,
            now()
          )
          on conflict (entity_id, fact_key, source_url) do update set
            fact_value = excluded.fact_value,
            source_id = excluded.source_id,
            confidence = excluded.confidence,
            verified_at = now()
        `;

        const seasonRows = await tx`select id from entities where entity_type = 'season' and slug = ${`season-${game.season}`} limit 1`;
        if (seasonRows[0]?.id) {
          await tx`
            insert into relations (from_entity_id, relation_type, to_entity_id, source_id, source_url)
            values (${gameId}, 'game_of_season', ${seasonRows[0].id}, 'raiders-official', ${game.sourceUrl})
            on conflict (from_entity_id, relation_type, to_entity_id) do nothing
          `;
        }

        await tx`
          insert into relations (from_entity_id, relation_type, to_entity_id, source_id, source_url)
          values (${rivalryId}, 'rivalry_game', ${gameId}, 'raiders-official', ${rivalry.sourceUrl})
          on conflict (from_entity_id, relation_type, to_entity_id) do nothing
        `;
        await tx`
          insert into relations (from_entity_id, relation_type, to_entity_id, source_id, source_url)
          values (${gameId}, 'game_rivalry', ${rivalryId}, 'raiders-official', ${rivalry.sourceUrl})
          on conflict (from_entity_id, relation_type, to_entity_id) do nothing
        `;

        if (game.site === 'home') {
          for (const venue of venues) {
            if (!venueCoversSeason(venue.metadata ?? {}, Number(game.season))) continue;
            await tx`
              insert into relations (from_entity_id, relation_type, to_entity_id, source_id, source_url)
              values (${venue.id}, 'venue_game', ${gameId}, 'raiders-official', ${game.sourceUrl})
              on conflict (from_entity_id, relation_type, to_entity_id) do nothing
            `;
            await tx`
              insert into relations (from_entity_id, relation_type, to_entity_id, source_id, source_url)
              values (${gameId}, 'game_venue', ${venue.id}, 'raiders-official', ${game.sourceUrl})
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
        (select count(*)::int from entities where entity_type = 'game') as games,
        (select count(*)::int from entities where entity_type = 'game' and metadata ->> 'gameType' = 'rivalry-series') as battle_games,
        (select count(*)::int from facts) as facts,
        (select count(*)::int from relations) as relations,
        (select count(*)::int from relations where relation_type = 'rivalry_game' and from_entity_id = (select id from entities where slug = 'san-francisco-49ers')) as battle_rivalry_links,
        (select count(*)::int from relations where relation_type = 'game_rivalry' and to_entity_id = (select id from entities where slug = 'san-francisco-49ers')) as battle_game_links,
        (select count(*)::int from relations where relation_type = 'game_venue' and from_entity_id in (select id from entities where entity_type = 'game' and metadata ->> 'gameType' = 'rivalry-series')) as battle_venue_links
    `;
    console.log('[db:v13] migration complete', counts[0]);
  } finally {
    if (lockHeld) {
      try { await sql`select pg_advisory_unlock(${LOCK_KEY})`; }
      catch (error) { console.warn('[db:v13] failed to release migration lock', error); }
    }
  }
}

try { await run(); }
finally { await sql.end({ timeout: 5 }); }
