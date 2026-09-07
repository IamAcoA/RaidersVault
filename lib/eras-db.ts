import classicGames from "@/data/classic-games.json";
import postseasonGames from "@/data/games.json";
import rawEras from "@/data/eras.json";
import rawVenues from "@/data/venues.json";
import { databaseConfigured, db, ensureDatabaseReady } from "@/lib/db";

export interface EraRecord {
  slug: string;
  name: string;
  location: string;
  startYear: number;
  endYear: number;
  ongoing?: boolean;
  summary: string;
  venueSlugs: string[];
  sourceLabel: string;
  sourceUrl: string;
}

export interface EraExhibit extends EraRecord {
  venues: Array<{ slug: string; name: string; city: string }>;
  seasonYears: number[];
  indexedGames: number;
  database: boolean;
}

const eras = rawEras as EraRecord[];
const venues = rawVenues as Array<{ slug: string; name: string; city: string }>;
const allGames = [...postseasonGames, ...classicGames];

function rangeYears(start: number, end: number) {
  const rows: number[] = [];
  for (let year = start; year <= end; year += 1) rows.push(year);
  return rows;
}

function fallback(slug: string): EraExhibit | null {
  const era = eras.find(item => item.slug === slug);
  if (!era) return null;
  return {
    ...era,
    venues: era.venueSlugs.flatMap(venueSlug => {
      const venue = venues.find(item => item.slug === venueSlug);
      return venue ? [{ slug: venue.slug, name: venue.name, city: venue.city }] : [];
    }),
    seasonYears: rangeYears(era.startYear, era.endYear),
    indexedGames: allGames.filter(game => game.season >= era.startYear && game.season <= era.endYear).length,
    database: false
  };
}

function yearFromDate(value: unknown) {
  if (value instanceof Date) return value.getUTCFullYear();
  return Number(String(value ?? "").slice(0, 4));
}

export function eraSlugs() {
  return eras.map(item => item.slug);
}

export async function getEraArchive(): Promise<{ rows: EraRecord[]; database: boolean }> {
  if (!databaseConfigured() || !(await ensureDatabaseReady())) return { rows: eras, database: false };
  try {
    const sql = db();
    const rows = await sql<Array<{ slug: string; display_name: string; metadata: Record<string, unknown> }>>`
      select slug, display_name, metadata
      from entities
      where entity_type = 'era'
      order by (metadata ->> 'startYear')::int
    `;
    if (!rows.length) return { rows: eras, database: true };
    return {
      rows: rows.map(row => ({
        slug: row.slug,
        name: row.display_name,
        location: String(row.metadata.location ?? ""),
        startYear: Number(row.metadata.startYear),
        endYear: Number(row.metadata.endYear),
        ongoing: Boolean(row.metadata.ongoing),
        summary: String(row.metadata.summary ?? ""),
        venueSlugs: Array.isArray(row.metadata.venueSlugs) ? row.metadata.venueSlugs.map(String) : [],
        sourceLabel: String(row.metadata.sourceLabel ?? "Las Vegas Raiders"),
        sourceUrl: String(row.metadata.sourceUrl ?? "")
      })),
      database: true
    };
  } catch {
    return { rows: eras, database: false };
  }
}

export async function getEraExhibit(slug: string): Promise<EraExhibit | null> {
  const fallbackRecord = fallback(slug);
  if (!fallbackRecord || !databaseConfigured() || !(await ensureDatabaseReady())) return fallbackRecord;

  try {
    const sql = db();
    const rows = await sql<Array<{ id: string; slug: string; display_name: string; metadata: Record<string, unknown> }>>`
      select id, slug, display_name, metadata
      from entities
      where entity_type = 'era' and slug = ${slug}
      limit 1
    `;
    const row = rows[0];
    if (!row) return fallbackRecord;

    const venueRows = await sql<Array<{ slug: string; display_name: string; metadata: Record<string, unknown> }>>`
      select e.slug, e.display_name, e.metadata
      from relations r
      join entities e on e.id = r.to_entity_id
      where r.from_entity_id = ${row.id}
        and r.relation_type = 'era_venue'
        and e.entity_type = 'venue'
      order by e.display_name
    `;
    const seasonRows = await sql<Array<{ start_date: unknown }>>`
      select e.start_date
      from relations r
      join entities e on e.id = r.to_entity_id
      where r.from_entity_id = ${row.id}
        and r.relation_type = 'era_season'
        and e.entity_type = 'season'
      order by e.start_date
    `;
    const metadata = row.metadata ?? {};
    const startYear = Number(metadata.startYear ?? fallbackRecord.startYear);
    const endYear = Number(metadata.endYear ?? fallbackRecord.endYear);
    const gameCountRows = await sql<Array<{ count: number }>>`
      select count(*)::int as count
      from entities
      where entity_type = 'game'
        and (metadata ->> 'season')::int between ${startYear} and ${endYear}
    `;

    return {
      slug: row.slug,
      name: row.display_name,
      location: String(metadata.location ?? fallbackRecord.location),
      startYear,
      endYear,
      ongoing: Boolean(metadata.ongoing),
      summary: String(metadata.summary ?? fallbackRecord.summary),
      venueSlugs: Array.isArray(metadata.venueSlugs) ? metadata.venueSlugs.map(String) : fallbackRecord.venueSlugs,
      sourceLabel: String(metadata.sourceLabel ?? fallbackRecord.sourceLabel),
      sourceUrl: String(metadata.sourceUrl ?? fallbackRecord.sourceUrl),
      venues: venueRows.map(venue => ({ slug: venue.slug, name: venue.display_name, city: String(venue.metadata.city ?? "") })),
      seasonYears: seasonRows.map(item => yearFromDate(item.start_date)),
      indexedGames: Number(gameCountRows[0]?.count ?? 0),
      database: true
    };
  } catch {
    return fallbackRecord;
  }
}
