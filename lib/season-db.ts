import championships from "@/data/championships.json";
import classicGames from "@/data/classic-games.json";
import legends from "@/data/legends.json";
import peopleProfiles from "@/data/people-profiles.json";
import postseasonGames from "@/data/games.json";
import { seasons as detailedSeasons } from "@/data/seasons";
import { databaseConfigured, db, ensureDatabaseReady } from "@/lib/db";

export interface SeasonArchiveRow {
  year: number;
  location: "Oakland" | "Los Angeles" | "Las Vegas";
  record: string;
  coach: string;
  finish: string;
  note: string;
  status: "verified-detail" | "indexed";
}

export interface SeasonRelatedExhibit {
  slug: string;
  name: string;
  type: string;
  relation: string;
  href: string;
}

interface RaidersRole {
  label: string;
  start: number;
  end: number;
  years?: number[];
}

interface PeopleProfile {
  slug: string;
  name: string;
  role: string;
  raidersRoles: RaidersRole[];
  seasonRanges: number[][];
}

export interface SeasonExhibit extends SeasonArchiveRow {
  sourceLabel: string;
  sourceUrl: string;
  related: SeasonRelatedExhibit[];
  people: SeasonRelatedExhibit[];
  database: boolean;
}

const PFR_FRANCHISE_URL = "https://www.pro-football-reference.com/teams/rai/index.htm";
const profiles = peopleProfiles as PeopleProfile[];
const hallOfFameSlugs = new Set(legends.map(item => item.slug));

function locationForSeason(year: number): SeasonArchiveRow["location"] {
  if (year <= 1981) return "Oakland";
  if (year <= 1994) return "Los Angeles";
  if (year <= 2019) return "Oakland";
  return "Las Vegas";
}

function currentFranchiseSeasonYear(): number {
  const now = new Date();
  return now.getUTCMonth() >= 2 ? now.getUTCFullYear() : now.getUTCFullYear() - 1;
}

export function seasonYears(): number[] {
  const rows: number[] = [];
  for (let year = 1960; year <= currentFranchiseSeasonYear(); year += 1) rows.push(year);
  return rows;
}

function rowForYear(year: number): SeasonArchiveRow {
  const detail = detailedSeasons.find(season => season.year === year);
  const location = locationForSeason(year);
  return {
    year,
    location,
    record: detail?.record ?? "",
    coach: detail?.coach ?? "",
    finish: detail?.finish ?? "",
    note: detail?.note ?? "Season indexed; detailed facts pending verification.",
    status: detail ? "verified-detail" : "indexed"
  };
}

function fallbackRows(): SeasonArchiveRow[] {
  return seasonYears().reverse().map(rowForYear);
}

function profileIncludesYear(profile: PeopleProfile, year: number) {
  return profile.seasonRanges.some(([start, end]) => year >= start && year <= end);
}

function activeRole(roles: RaidersRole[], year: number) {
  const role = roles.find(item => Array.isArray(item.years) ? item.years.includes(year) : year >= item.start && year <= item.end);
  return role?.label ?? "Raiders figure";
}

function personHref(slug: string) {
  return hallOfFameSlugs.has(slug) ? `/legends/${slug}` : `/players/${slug}`;
}

function fallbackPeople(year: number): SeasonRelatedExhibit[] {
  return profiles.filter(profile => profileIncludesYear(profile, year)).map(profile => ({
    slug: profile.slug,
    name: profile.name,
    type: profile.role,
    relation: activeRole(profile.raidersRoles, year),
    href: personHref(profile.slug)
  }));
}

function fallbackRelated(year: number): SeasonRelatedExhibit[] {
  const games: SeasonRelatedExhibit[] = [...postseasonGames, ...classicGames]
    .filter(game => game.season === year)
    .map(game => {
      const nickname = "nickname" in game ? String(game.nickname ?? "") : "";
      return {
        slug: String(game.slug),
        name: nickname || `Raiders vs. ${String(game.opponent)}`,
        type: "game",
        relation: "Season game",
        href: `/games/${String(game.slug)}`
      };
    });
  const titles: SeasonRelatedExhibit[] = championships
    .filter(championship => championship.season === year)
    .map(championship => ({
      slug: String(championship.slug),
      name: String(championship.name),
      type: "championship",
      relation: "Championship",
      href: `/championships/${String(championship.slug)}`
    }));
  return [...titles, ...games];
}

export async function getSeasonArchive(): Promise<{ rows: SeasonArchiveRow[]; database: boolean }> {
  if (!databaseConfigured() || !(await ensureDatabaseReady())) {
    return { rows: fallbackRows(), database: false };
  }

  try {
    const sql = db();
    const rows = await sql<Array<{
      start_date: string;
      metadata: Record<string, unknown>;
    }>>`
      select start_date, metadata
      from entities
      where entity_type = 'season'
      order by start_date desc
    `;

    const mapped: SeasonArchiveRow[] = rows.map(row => {
      const metadata = row.metadata ?? {};
      const year = Number(String(row.start_date).slice(0, 4));
      const location = String(metadata.location ?? locationForSeason(year)) as SeasonArchiveRow["location"];
      const status = metadata.status === "verified-detail" ? "verified-detail" : "indexed";
      return {
        year,
        location,
        record: String(metadata.record ?? ""),
        coach: String(metadata.coach ?? ""),
        finish: String(metadata.finish ?? ""),
        note: String(metadata.note ?? "Season indexed; detailed facts pending verification."),
        status
      };
    });

    return { rows: mapped.length ? mapped : fallbackRows(), database: true };
  } catch {
    return { rows: fallbackRows(), database: false };
  }
}

export async function getSeasonExhibit(year: number): Promise<SeasonExhibit | null> {
  if (!seasonYears().includes(year)) return null;
  const fallback: SeasonExhibit = {
    ...rowForYear(year),
    sourceLabel: "Pro Football Reference",
    sourceUrl: PFR_FRANCHISE_URL,
    related: fallbackRelated(year),
    people: fallbackPeople(year),
    database: false
  };
  if (!databaseConfigured() || !(await ensureDatabaseReady())) return fallback;

  try {
    const sql = db();
    const rows = await sql<Array<{ id: string; start_date: string; metadata: Record<string, unknown> }>>`
      select id, start_date, metadata
      from entities
      where entity_type = 'season' and slug = ${`season-${year}`}
      limit 1
    `;
    const row = rows[0];
    if (!row) return fallback;
    const metadata = row.metadata ?? {};
    const relatedRows = await sql<Array<{ slug: string; display_name: string; entity_type: string; relation_type: string }>>`
      select e.slug, e.display_name, e.entity_type, r.relation_type
      from relations r
      join entities e on e.id = r.from_entity_id
      where r.to_entity_id = ${row.id}
        and e.entity_type in ('game','championship')
      order by e.start_date, e.display_name
    `;
    const peopleRows = await sql<Array<{ slug: string; display_name: string; entity_type: string; metadata: Record<string, unknown> }>>`
      select e.slug, e.display_name, e.entity_type, e.metadata
      from relations r
      join entities e on e.id = r.to_entity_id
      where r.from_entity_id = ${row.id}
        and r.relation_type = 'season_person'
      order by e.display_name
    `;
    return {
      year,
      location: String(metadata.location ?? locationForSeason(year)) as SeasonArchiveRow["location"],
      record: String(metadata.record ?? ""),
      coach: String(metadata.coach ?? ""),
      finish: String(metadata.finish ?? ""),
      note: String(metadata.note ?? "Season indexed; detailed facts pending verification."),
      status: metadata.status === "verified-detail" ? "verified-detail" : "indexed",
      sourceLabel: "Pro Football Reference",
      sourceUrl: PFR_FRANCHISE_URL,
      related: relatedRows.map(item => ({
        slug: item.slug,
        name: item.display_name,
        type: item.entity_type,
        relation: item.entity_type === "championship" ? "Championship" : "Season game",
        href: item.entity_type === "championship" ? `/championships/${item.slug}` : `/games/${item.slug}`
      })),
      people: peopleRows.map(item => ({
        slug: item.slug,
        name: item.display_name,
        type: item.entity_type,
        relation: activeRole(Array.isArray(item.metadata.raidersRoles) ? item.metadata.raidersRoles as RaidersRole[] : [], year),
        href: item.metadata.collection === "Pro Football Hall of Fame" ? `/legends/${item.slug}` : `/players/${item.slug}`
      })),
      database: true
    };
  } catch {
    return fallback;
  }
}
