import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import postgres from "postgres";

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  console.log("[db] DATABASE_URL not configured; skipping migration.");
  process.exit(0);
}

const MIGRATION_VERSION = "4";
const MIGRATION_LOCK_KEY = 724325198;
const PFR_FRANCHISE_URL = "https://www.pro-football-reference.com/teams/rai/index.htm";
const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, "..");
const readJson = async (relative) => JSON.parse(await fs.readFile(path.join(root, relative), "utf8"));
const sql = postgres(databaseUrl, { max: 1, connect_timeout: 15, prepare: false });

function yearRange(years) {
  const found = String(years ?? "").match(/\d{4}/g) ?? [];
  return {
    start: found[0] ? `${found[0]}-01-01` : null,
    end: found.length > 1 ? `${found.at(-1)}-12-31` : null
  };
}

function slugify(value) {
  return String(value).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

function locationForSeason(year) {
  if (year <= 1981) return "Oakland";
  if (year <= 1994) return "Los Angeles";
  if (year <= 2019) return "Oakland";
  return "Las Vegas";
}

function currentFranchiseSeasonYear() {
  const now = new Date();
  return now.getUTCMonth() >= 2 ? now.getUTCFullYear() : now.getUTCFullYear() - 1;
}

function legendSubtitle(legend) {
  const label = legend.role === "executive" ? "Executive" : legend.role === "coach" ? "Coach" : "Player";
  return `${label} · ${legend.collection}`;
}

async function runMigration() {
  let lockHeld = false;
  try {
    await sql`select pg_advisory_lock(${MIGRATION_LOCK_KEY})`;
    lockHeld = true;

    const metaCheck = await sql`select to_regclass('public.app_meta')::text as app_meta`;
    if (metaCheck[0]?.app_meta) {
      const rows = await sql`select value from app_meta where key = 'schema_version' limit 1`;
      if (String(rows[0]?.value ?? "") === MIGRATION_VERSION) {
        console.log(`[db] schema version ${MIGRATION_VERSION} already current; migration skipped`);
        return;
      }
    }

    const [schema, sources, players, seasons, moments, timeline, legends, championships] = await Promise.all([
      fs.readFile(path.join(root, "db/schema.sql"), "utf8"),
      readJson("data/source-registry.json"),
      readJson("data/players.json"),
      readJson("data/seasons.json"),
      readJson("data/moments.json"),
      readJson("data/timeline.json"),
      readJson("data/legends.json"),
      readJson("data/championships.json")
    ]);

    await sql.unsafe(schema);

    await sql.begin(async tx => {
      for (const source of sources) {
        await tx`
          insert into sources (id, name, homepage, source_type, trust, ingestion_method, copy_policy, enabled, metadata, updated_at)
          values (${source.id}, ${source.name}, ${source.homepage}, ${source.type}, ${source.trust}, ${source.ingestion}, ${source.copyPolicy}, ${source.enabled}, ${tx.json(source)}, now())
          on conflict (id) do update set
            name = excluded.name,
            homepage = excluded.homepage,
            source_type = excluded.source_type,
            trust = excluded.trust,
            ingestion_method = excluded.ingestion_method,
            copy_policy = excluded.copy_policy,
            enabled = excluded.enabled,
            metadata = excluded.metadata,
            updated_at = now()
        `;
      }

      for (const player of players) {
        const range = yearRange(player.years);
        const rows = await tx`
          insert into entities (entity_type, slug, display_name, start_date, end_date, metadata)
          values ('player', ${player.slug}, ${player.name}, ${range.start}, ${range.end}, ${tx.json({ ...player, subtitle: `${player.position} · ${player.years}${player.number ? ` · #${player.number}` : ""}` })})
          on conflict (slug) do update set display_name = excluded.display_name, start_date = excluded.start_date, end_date = excluded.end_date, metadata = excluded.metadata, updated_at = now()
          returning id
        `;
        const entityId = rows[0]?.id;
        if (entityId && player.sourceUrl) {
          await tx`
            insert into facts (entity_id, fact_key, fact_value, source_id, source_url, confidence, verified_at)
            values (${entityId}, 'player_profile', ${tx.json({ position: player.position, years: player.years, number: player.number ?? null, distinction: player.distinction })}, ${player.sourceId ?? 'raiders-official'}, ${player.sourceUrl}, 1.0, now())
            on conflict (entity_id, fact_key, source_url) do update set fact_value = excluded.fact_value, source_id = excluded.source_id, confidence = excluded.confidence, verified_at = now()
          `;
        }
      }

      for (const legend of legends) {
        const rows = await tx`
          insert into entities (entity_type, slug, display_name, metadata)
          values (${legend.role}, ${legend.slug}, ${legend.name}, ${tx.json({ ...legend, hallOfFame: true, subtitle: legendSubtitle(legend) })})
          on conflict (slug) do update set
            display_name = excluded.display_name,
            metadata = entities.metadata || excluded.metadata,
            updated_at = now()
          returning id
        `;
        const entityId = rows[0]?.id;
        if (entityId) {
          await tx`
            insert into facts (entity_id, fact_key, fact_value, source_id, source_url, confidence, verified_at)
            values (${entityId}, 'hall_of_fame_membership', ${tx.json({ collection: legend.collection, role: legend.role })}, 'pro-football-hof', ${legend.sourceUrl}, 1.0, now())
            on conflict (entity_id, fact_key, source_url) do update set fact_value = excluded.fact_value, source_id = excluded.source_id, verified_at = now()
          `;
        }
      }

      const detailedSeasons = new Map(seasons.map(season => [Number(season.year), season]));
      const finalSeasonYear = currentFranchiseSeasonYear();
      for (let year = 1960; year <= finalSeasonYear; year += 1) {
        const location = locationForSeason(year);
        const detail = detailedSeasons.get(year);
        const metadata = detail
          ? { ...detail, status: "verified-detail", subtitle: `${detail.record} · ${detail.coach}` }
          : {
              year,
              location,
              status: "indexed",
              subtitle: `${location} Raiders season`,
              note: "Season indexed in franchise chronology; detailed season data is pending verification."
            };

        const rows = await tx`
          insert into entities (entity_type, slug, display_name, start_date, end_date, metadata)
          values ('season', ${`season-${year}`}, ${`${year} ${location} Raiders`}, ${`${year}-01-01`}, ${`${year}-12-31`}, ${tx.json(metadata)})
          on conflict (slug) do update set display_name = excluded.display_name, start_date = excluded.start_date, end_date = excluded.end_date, metadata = excluded.metadata, updated_at = now()
          returning id
        `;

        const entityId = rows[0]?.id;
        if (entityId) {
          await tx`
            insert into facts (entity_id, fact_key, fact_value, source_id, source_url, confidence, verified_at)
            values (${entityId}, 'season_identity', ${tx.json({ year, location })}, 'pro-football-reference', ${PFR_FRANCHISE_URL}, 1.0, now())
            on conflict (entity_id, fact_key, source_url) do update set fact_value = excluded.fact_value, source_id = excluded.source_id, verified_at = now()
          `;

          if (detail) {
            await tx`
              insert into facts (entity_id, fact_key, fact_value, source_id, source_url, confidence, verified_at)
              values (${entityId}, 'season_detail', ${tx.json(detail)}, 'pro-football-reference', ${PFR_FRANCHISE_URL}, 0.99, now())
              on conflict (entity_id, fact_key, source_url) do update set fact_value = excluded.fact_value, source_id = excluded.source_id, confidence = excluded.confidence, verified_at = now()
            `;
          }
        }
      }

      for (const moment of moments) {
        await tx`
          insert into entities (entity_type, slug, display_name, start_date, metadata)
          values ('moment', ${moment.slug}, ${moment.title}, ${moment.date}, ${tx.json({ ...moment, subtitle: `${moment.date}${moment.opponent ? ` · vs. ${moment.opponent}` : ""}` })})
          on conflict (slug) do update set display_name = excluded.display_name, start_date = excluded.start_date, metadata = excluded.metadata, updated_at = now()
        `;
      }

      for (const event of timeline) {
        const slug = `event-${event.date}-${slugify(event.title)}`;
        const sourceId = event.sourceLabel.toLowerCase().includes("hall of fame") ? "pro-football-hof" : "raiders-official";
        const rows = await tx`
          insert into entities (entity_type, slug, display_name, start_date, metadata)
          values ('event', ${slug}, ${event.title}, ${event.date}, ${tx.json({ ...event, subtitle: `${event.year} · ${event.era}` })})
          on conflict (slug) do update set display_name = excluded.display_name, start_date = excluded.start_date, metadata = excluded.metadata, updated_at = now()
          returning id
        `;
        const entityId = rows[0]?.id;
        if (entityId) {
          await tx`
            insert into facts (entity_id, fact_key, fact_value, source_id, source_url, confidence, verified_at)
            values (${entityId}, 'summary', ${tx.json(event.summary)}, ${sourceId}, ${event.sourceUrl}, 1.0, now())
            on conflict (entity_id, fact_key, source_url) do update set fact_value = excluded.fact_value, source_id = excluded.source_id, verified_at = now()
          `;
        }
      }

      for (const championship of championships) {
        const sourceId = championship.sourceLabel.toLowerCase().includes("hall of fame") ? "pro-football-hof" : "raiders-official";
        const rows = await tx`
          insert into entities (entity_type, slug, display_name, start_date, metadata)
          values ('championship', ${championship.slug}, ${championship.name}, ${championship.date}, ${tx.json({ ...championship, subtitle: `${championship.score} · vs. ${championship.opponent}` })})
          on conflict (slug) do update set display_name = excluded.display_name, start_date = excluded.start_date, metadata = excluded.metadata, updated_at = now()
          returning id
        `;
        const championshipId = rows[0]?.id;
        if (!championshipId) continue;

        await tx`
          insert into facts (entity_id, fact_key, fact_value, source_id, source_url, confidence, verified_at)
          values (${championshipId}, 'championship_result', ${tx.json({ season: championship.season, opponent: championship.opponent, score: championship.score, mvp: championship.mvp ?? null })}, ${sourceId}, ${championship.sourceUrl}, 1.0, now())
          on conflict (entity_id, fact_key, source_url) do update set fact_value = excluded.fact_value, source_id = excluded.source_id, verified_at = now()
        `;

        const seasonRows = await tx`select id from entities where slug = ${`season-${championship.season}`} limit 1`;
        const seasonId = seasonRows[0]?.id;
        if (seasonId) {
          await tx`
            insert into relations (from_entity_id, relation_type, to_entity_id, source_id, source_url)
            values (${championshipId}, 'championship_of_season', ${seasonId}, ${sourceId}, ${championship.sourceUrl})
            on conflict (from_entity_id, relation_type, to_entity_id) do nothing
          `;
        }

        if (championship.mvp) {
          const mvpRows = await tx`select id from entities where slug = ${slugify(championship.mvp)} limit 1`;
          const mvpId = mvpRows[0]?.id;
          if (mvpId) {
            await tx`
              insert into relations (from_entity_id, relation_type, to_entity_id, source_id, source_url)
              values (${championshipId}, 'championship_mvp', ${mvpId}, ${sourceId}, ${championship.sourceUrl})
              on conflict (from_entity_id, relation_type, to_entity_id) do nothing
            `;
          }
        }
      }

      await tx`
        insert into app_meta (key, value, updated_at)
        values ('schema_version', ${MIGRATION_VERSION}, now())
        on conflict (key) do update set value = excluded.value, updated_at = now()
      `;
    });

    const counts = await sql`
      select
        (select count(*)::int from sources) as sources,
        (select count(*)::int from entities) as entities,
        (select count(*)::int from facts) as facts,
        (select count(*)::int from relations) as relations
    `;
    console.log(`[db] migration ${MIGRATION_VERSION} complete`, counts[0]);
  } finally {
    if (lockHeld) {
      try {
        await sql`select pg_advisory_unlock(${MIGRATION_LOCK_KEY})`;
      } catch (error) {
        console.warn("[db] failed to release migration lock", error);
      }
    }
  }
}

try {
  await runMigration();
} finally {
  await sql.end({ timeout: 5 });
}
