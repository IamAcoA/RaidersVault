import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import postgres from "postgres";

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  console.log("[db] DATABASE_URL not configured; skipping migration.");
  process.exit(0);
}

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

try {
  const [schema, sources, players, seasons, moments, timeline] = await Promise.all([
    fs.readFile(path.join(root, "db/schema.sql"), "utf8"),
    readJson("data/source-registry.json"),
    readJson("data/players.json"),
    readJson("data/seasons.json"),
    readJson("data/moments.json"),
    readJson("data/timeline.json")
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
      await tx`
        insert into entities (entity_type, slug, display_name, start_date, end_date, metadata)
        values ('player', ${player.slug}, ${player.name}, ${range.start}, ${range.end}, ${tx.json({ ...player, subtitle: `${player.position} · ${player.years}${player.number ? ` · #${player.number}` : ""}` })})
        on conflict (slug) do update set display_name = excluded.display_name, start_date = excluded.start_date, end_date = excluded.end_date, metadata = excluded.metadata, updated_at = now()
      `;
    }

    for (const season of seasons) {
      await tx`
        insert into entities (entity_type, slug, display_name, start_date, end_date, metadata)
        values ('season', ${`season-${season.year}`}, ${`${season.year} ${season.location} Raiders`}, ${`${season.year}-01-01`}, ${`${season.year}-12-31`}, ${tx.json({ ...season, subtitle: `${season.record} · ${season.coach}` })})
        on conflict (slug) do update set display_name = excluded.display_name, start_date = excluded.start_date, end_date = excluded.end_date, metadata = excluded.metadata, updated_at = now()
      `;
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
  });

  const counts = await sql`
    select
      (select count(*)::int from sources) as sources,
      (select count(*)::int from entities) as entities,
      (select count(*)::int from facts) as facts
  `;
  console.log("[db] migration complete", counts[0]);
} finally {
  await sql.end({ timeout: 5 });
}
