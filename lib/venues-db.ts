import classicGames from "@/data/classic-games.json";
import postseasonGames from "@/data/games.json";
import rawEras from "@/data/eras.json";
import rawVenues from "@/data/venues.json";
import { databaseConfigured, db, ensureDatabaseReady } from "@/lib/db";

export interface VenueRange {
  start: number;
  end: number;
  partial?: boolean;
  ongoing?: boolean;
  note?: string;
}

export interface VenueRecord {
  slug: string;
  name: string;
  city: string;
  summary: string;
  homeRanges: VenueRange[];
  sourceLabel: string;
  sourceUrl: string;
}

export interface VenueGame {
  slug: string;
  season: number;
  date: string;
  name: string;
  opponent: string;
  result: string;
  score: string;
}

export interface VenueExhibit extends VenueRecord {
  eras: Array<{ slug: string; name: string; startYear: number; endYear: number }>;
  seasonYears: number[];
  indexedGames: VenueGame[];
  database: boolean;
}

type EraRecord = {
  slug: string;
  name: string;
  startYear: number;
  endYear: number;
  venueSlugs: string[];
};

const venues = rawVenues as VenueRecord[];
const eras = rawEras as EraRecord[];
const allGames = [...postseasonGames, ...classicGames];

function yearInRanges(year: number, ranges: VenueRange[]) {
  return ranges.some(range => year >= range.start && year <= range.end);
}

function fallbackGames(venue: VenueRecord): VenueGame[] {
  return allGames
    .filter(game => game.site === "home" && yearInRanges(game.season, venue.homeRanges))
    .map(game => ({
      slug: game.slug,
      season: game.season,
      date: game.date,
      name: "nickname" in game && game.nickname ? String(game.nickname) : `Raiders vs. ${game.opponent}`,
      opponent: game.opponent,
      result: game.result,
      score: `${game.raidersScore}–${game.opponentScore}`
    }))
    .sort((a, b) => a.date.localeCompare(b.date));
}

function rangeYears(ranges: VenueRange[]) {
  const years = new Set<number>();
  for (const range of ranges) {
    for (let year = range.start; year <= range.end; year += 1) years.add(year);
  }
  return [...years].sort((a, b) => a - b);
}

function fallback(slug: string): VenueExhibit | null {
  const venue = venues.find(item => item.slug === slug);
  if (!venue) return null;
  return {
    ...venue,
    eras: eras.filter(era => era.venueSlugs.includes(slug)).map(era => ({ slug: era.slug, name: era.name, startYear: era.startYear, endYear: era.endYear })),
    seasonYears: rangeYears(venue.homeRanges),
    indexedGames: fallbackGames(venue),
    database: false
  };
}

function isoDate(value: unknown) {
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  return String(value ?? "").slice(0, 10);
}

export function venueSlugs() {
  return venues.map(item => item.slug);
}

export async function getVenueArchive(): Promise<{ rows: VenueRecord[]; database: boolean }> {
  if (!databaseConfigured() || !(await ensureDatabaseReady())) return { rows: venues, database: false };
  try {
    const sql = db();
    const rows = await sql<Array<{ slug: string; display_name: string; metadata: Record<string, unknown> }>>`
      select slug, display_name, metadata
      from entities
      where entity_type = 'venue'
      order by coalesce((metadata -> 'homeRanges' -> 0 ->> 'start')::int, 9999), display_name
    `;
    if (!rows.length) return { rows: venues, database: true };
    return {
      rows: rows.map(row => ({
        slug: row.slug,
        name: row.display_name,
        city: String(row.metadata.city ?? ""),
        summary: String(row.metadata.summary ?? ""),
        homeRanges: Array.isArray(row.metadata.homeRanges) ? row.metadata.homeRanges as VenueRange[] : [],
        sourceLabel: String(row.metadata.sourceLabel ?? "Las Vegas Raiders"),
        sourceUrl: String(row.metadata.sourceUrl ?? "")
      })),
      database: true
    };
  } catch {
    return { rows: venues, database: false };
  }
}

export async function getVenueExhibit(slug: string): Promise<VenueExhibit | null> {
  const fallbackRecord = fallback(slug);
  if (!fallbackRecord || !databaseConfigured() || !(await ensureDatabaseReady())) return fallbackRecord;

  try {
    const sql = db();
    const rows = await sql<Array<{ id: string; slug: string; display_name: string; metadata: Record<string, unknown> }>>`
      select id, slug, display_name, metadata
      from entities
      where entity_type = 'venue' and slug = ${slug}
      limit 1
    `;
    const row = rows[0];
    if (!row) return fallbackRecord;

    const eraRows = await sql<Array<{ slug: string; display_name: string; metadata: Record<string, unknown> }>>`
      select e.slug, e.display_name, e.metadata
      from relations r
      join entities e on e.id = r.from_entity_id
      where r.to_entity_id = ${row.id}
        and r.relation_type = 'era_venue'
        and e.entity_type = 'era'
      order by (e.metadata ->> 'startYear')::int
    `;
    const seasonRows = await sql<Array<{ start_date: unknown }>>`
      select e.start_date
      from relations r
      join entities e on e.id = r.to_entity_id
      where r.from_entity_id = ${row.id}
        and r.relation_type = 'venue_home_season'
        and e.entity_type = 'season'
      order by e.start_date
    `;
    const gameRows = await sql<Array<{ slug: string; display_name: string; start_date: unknown; metadata: Record<string, unknown> }>>`
      select e.slug, e.display_name, e.start_date, e.metadata
      from relations r
      join entities e on e.id = r.to_entity_id
      where r.from_entity_id = ${row.id}
        and r.relation_type = 'venue_game'
        and e.entity_type = 'game'
      order by e.start_date
    `;
    const metadata = row.metadata ?? {};
    return {
      slug: row.slug,
      name: row.display_name,
      city: String(metadata.city ?? fallbackRecord.city),
      summary: String(metadata.summary ?? fallbackRecord.summary),
      homeRanges: Array.isArray(metadata.homeRanges) ? metadata.homeRanges as VenueRange[] : fallbackRecord.homeRanges,
      sourceLabel: String(metadata.sourceLabel ?? fallbackRecord.sourceLabel),
      sourceUrl: String(metadata.sourceUrl ?? fallbackRecord.sourceUrl),
      eras: eraRows.map(era => ({
        slug: era.slug,
        name: era.display_name,
        startYear: Number(era.metadata.startYear),
        endYear: Number(era.metadata.endYear)
      })),
      seasonYears: seasonRows.map(item => Number(isoDate(item.start_date).slice(0, 4))),
      indexedGames: gameRows.map(game => ({
        slug: game.slug,
        season: Number(game.metadata.season),
        date: isoDate(game.start_date),
        name: String(game.metadata.nickname ?? game.display_name),
        opponent: String(game.metadata.opponent ?? ""),
        result: String(game.metadata.result ?? ""),
        score: `${String(game.metadata.raidersScore ?? "")}–${String(game.metadata.opponentScore ?? "")}`
      })),
      database: true
    };
  } catch {
    return fallbackRecord;
  }
}
