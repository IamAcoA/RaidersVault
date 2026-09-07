import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import postgres from "postgres";

const execFileAsync = promisify(execFile);
const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  console.log("[db:v12] DATABASE_URL not configured; skipping migration.");
  process.exit(0);
}

const VERSION = "12";
const LOCK_KEY = 724325212;
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
  if (version === VERSION || version === "11") return;
  console.log(`[db:v12] v11 foundation required from ${version ?? "none"}`);
  const { stdout, stderr } = await execFileAsync(process.execPath, ["scripts/migrate-v11-numbers.mjs"], {
    cwd: root,
    env: process.env,
    timeout: 90000
  });
  if (stdout.trim()) console.log(stdout.trim());
  if (stderr.trim()) console.warn(stderr.trim());
}

function yearInRanges(year, ranges) {
  return ranges.some(range => year >= Number(range.start) && year <= Number(range.end));
}

async function run() {
  await ensureFoundation();
  let lockHeld = false;
  try {
    await sql`select pg_advisory_lock(${LOCK_KEY})`;
    lockHeld = true;
    if (await schemaVersion() === VERSION) {
      console.log(`[db:v12] schema version ${VERSION} already current; migration skipped`);
      return;
    }

    const venues = JSON.parse(await fs.readFile(path.join(root, "data/venues.json"), "utf8"));
    const eras = JSON.parse(await fs.readFile(path.join(root, "data/eras.json"), "utf8"));

    await sql.begin(async tx => {
      const gameRows = await tx`
        select id, metadata
        from entities
        where entity_type = 'game'
      `;

      for (const venue of venues) {
        const rows = await tx`
          insert into entities (entity_type, slug, display_name, metadata)
          values (
            'venue',
            ${venue.slug},
            ${venue.name},
            ${tx.json({
              city: venue.city,
              summary: venue.summary,
              homeRanges: venue.homeRanges,
              sourceLabel: venue.sourceLabel,
              sourceUrl: venue.sourceUrl,
              subtitle: venue.city
            })}
          )
          on conflict (slug) do update set
            entity_type = 'venue',
            display_name = excluded.display_name,
            metadata = excluded.metadata,
            updated_at = now()
          returning id
        `;
        const venueId = rows[0]?.id;
        if (!venueId) continue;

        await tx`
          insert into facts (entity_id, fact_key, fact_value, source_id, source_url, confidence, verified_at)
          values (
            ${venueId},
            'home_history',
            ${tx.json({ city: venue.city, homeRanges: venue.homeRanges, summary: venue.summary })},
            'raiders-official',
            ${venue.sourceUrl},
            1.0,
            now()
          )
          on conflict (entity_id, fact_key, source_url) do update set
            fact_value = excluded.fact_value,
            source_id = excluded.source_id,
            confidence = excluded.confidence,
            verified_at = now()
        `;

        for (const range of venue.homeRanges) {
          for (let year = Number(range.start); year <= Number(range.end); year += 1) {
            const seasons = await tx`
              select id from entities where entity_type = 'season' and slug = ${`season-${year}`} limit 1
            `;
            if (!seasons[0]?.id) continue;
            await tx`
              insert into relations (from_entity_id, relation_type, to_entity_id, source_id, source_url)
              values (${venueId}, 'venue_home_season', ${seasons[0].id}, 'raiders-official', ${venue.sourceUrl})
              on conflict (from_entity_id, relation_type, to_entity_id) do nothing
            `;
          }
        }

        for (const game of gameRows) {
          const metadata = game.metadata ?? {};
          const season = Number(metadata.season);
          if (metadata.site !== 'home' || !Number.isFinite(season) || !yearInRanges(season, venue.homeRanges)) continue;
          await tx`
            insert into relations (from_entity_id, relation_type, to_entity_id, source_id, source_url)
            values (${venueId}, 'venue_game', ${game.id}, 'raiders-official', ${venue.sourceUrl})
            on conflict (from_entity_id, relation_type, to_entity_id) do nothing
          `;
        }
      }

      for (const era of eras) {
        const rows = await tx`
          insert into entities (entity_type, slug, display_name, start_date, end_date, metadata)
          values (
            'era',
            ${era.slug},
            ${era.name},
            ${`${era.startYear}-01-01`},
            ${`${era.endYear}-12-31`},
            ${tx.json({
              location: era.location,
              startYear: era.startYear,
              endYear: era.endYear,
              ongoing: Boolean(era.ongoing),
              summary: era.summary,
              venueSlugs: era.venueSlugs,
              sourceLabel: era.sourceLabel,
              sourceUrl: era.sourceUrl,
              subtitle: `${era.startYear}–${era.endYear}${era.ongoing ? '+' : ''}`
            })}
          )
          on conflict (slug) do update set
            entity_type = 'era',
            display_name = excluded.display_name,
            start_date = excluded.start_date,
            end_date = excluded.end_date,
            metadata = excluded.metadata,
            updated_at = now()
          returning id
        `;
        const eraId = rows[0]?.id;
        if (!eraId) continue;

        await tx`
          insert into facts (entity_id, fact_key, fact_value, source_id, source_url, confidence, verified_at)
          values (
            ${eraId},
            'franchise_era',
            ${tx.json({ location: era.location, startYear: era.startYear, endYear: era.endYear, ongoing: Boolean(era.ongoing), summary: era.summary })},
            'raiders-official',
            ${era.sourceUrl},
            1.0,
            now()
          )
          on conflict (entity_id, fact_key, source_url) do update set
            fact_value = excluded.fact_value,
            source_id = excluded.source_id,
            confidence = excluded.confidence,
            verified_at = now()
        `;

        for (let year = Number(era.startYear); year <= Number(era.endYear); year += 1) {
          const seasons = await tx`
            select id from entities where entity_type = 'season' and slug = ${`season-${year}`} limit 1
          `;
          if (!seasons[0]?.id) continue;
          await tx`
            insert into relations (from_entity_id, relation_type, to_entity_id, source_id, source_url)
            values (${eraId}, 'era_season', ${seasons[0].id}, 'raiders-official', ${era.sourceUrl})
            on conflict (from_entity_id, relation_type, to_entity_id) do nothing
          `;
        }

        for (const venueSlug of era.venueSlugs) {
          const venueRows = await tx`
            select id from entities where entity_type = 'venue' and slug = ${venueSlug} limit 1
          `;
          if (!venueRows[0]?.id) continue;
          await tx`
            insert into relations (from_entity_id, relation_type, to_entity_id, source_id, source_url)
            values (${eraId}, 'era_venue', ${venueRows[0].id}, 'raiders-official', ${era.sourceUrl})
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
        (select count(*)::int from entities where entity_type = 'venue') as venues,
        (select count(*)::int from entities where entity_type = 'era') as eras,
        (select count(*)::int from facts) as facts,
        (select count(*)::int from relations) as relations,
        (select count(*)::int from relations where relation_type = 'venue_home_season') as venue_seasons,
        (select count(*)::int from relations where relation_type = 'venue_game') as venue_games,
        (select count(*)::int from relations where relation_type = 'era_season') as era_seasons,
        (select count(*)::int from relations where relation_type = 'era_venue') as era_venues
    `;
    console.log('[db:v12] migration complete', counts[0]);
  } finally {
    if (lockHeld) {
      try { await sql`select pg_advisory_unlock(${LOCK_KEY})`; }
      catch (error) { console.warn('[db:v12] failed to release migration lock', error); }
    }
  }
}

try { await run(); }
finally { await sql.end({ timeout: 5 }); }
