import fallbackGames from "@/data/games.json";
import fallbackClassicGames from "@/data/classic-games.json";
import fallbackRivalryGames from "@/data/battle-of-the-bay-games.json";
import { moments } from "@/data/moments";
import { databaseConfigured, db, ensureDatabaseReady } from "@/lib/db";

export interface GameArchiveRow {
  slug: string;
  season: number;
  date: string;
  round: string;
  opponent: string;
  result: "W" | "L";
  raidersScore: number;
  opponentScore: number;
  site: "home" | "away" | "neutral";
  overtime: boolean;
  gameType?: string;
  nickname?: string;
  sourceLabel: string;
  sourceUrl: string;
}

export interface GameExhibit extends GameArchiveRow {
  related: Array<{ slug: string; name: string; relation: string; href: string }>;
  database: boolean;
}

const postseasonFallback = fallbackGames as GameArchiveRow[];
const classicFallback = fallbackClassicGames as GameArchiveRow[];
const rivalryFallback = fallbackRivalryGames as GameArchiveRow[];
const fallback = [...postseasonFallback, ...classicFallback, ...rivalryFallback];

function fallbackRelated(game: GameArchiveRow) {
  const links = [
    {
      slug: `season-${game.season}`,
      name: `${game.season} Raiders season`,
      relation: "Season",
      href: `/seasons/${game.season}`
    },
    ...moments.filter(moment => moment.gameSlug === game.slug).map(moment => ({
      slug: moment.slug,
      name: moment.title,
      relation: "Archive moment",
      href: `/moments/${moment.slug}`
    }))
  ];
  if (game.gameType === "rivalry-series" && game.opponent === "San Francisco 49ers") {
    links.push({
      slug: "san-francisco-49ers",
      name: "Battle of the Bay",
      relation: "Rivalry",
      href: "/rivalries/san-francisco-49ers"
    });
  }
  return links;
}

function isoDate(value: unknown): string {
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  return String(value ?? "").slice(0, 10);
}

function mapRow(row: { slug: string; start_date: unknown; metadata: Record<string, unknown> }): GameArchiveRow {
  return {
    slug: row.slug,
    season: Number(row.metadata.season),
    date: isoDate(row.start_date),
    round: String(row.metadata.round),
    opponent: String(row.metadata.opponent),
    result: String(row.metadata.result) as "W" | "L",
    raidersScore: Number(row.metadata.raidersScore),
    opponentScore: Number(row.metadata.opponentScore),
    site: String(row.metadata.site) as GameArchiveRow["site"],
    overtime: Boolean(row.metadata.overtime),
    gameType: row.metadata.gameType ? String(row.metadata.gameType) : undefined,
    nickname: row.metadata.nickname ? String(row.metadata.nickname) : undefined,
    sourceLabel: String(row.metadata.sourceLabel ?? "Source"),
    sourceUrl: String(row.metadata.sourceUrl ?? "")
  };
}

async function getArchiveByType(gameType: string, fallbackRows: GameArchiveRow[]) {
  if (!databaseConfigured() || !(await ensureDatabaseReady())) return { rows: fallbackRows, database: false };
  try {
    const sql = db();
    const rows = await sql<Array<{ slug: string; start_date: unknown; metadata: Record<string, unknown> }>>`
      select slug, start_date, metadata from entities
      where entity_type = 'game' and metadata ->> 'gameType' = ${gameType}
      order by start_date
    `;
    const mapped = rows.map(mapRow);
    return { rows: mapped.length ? mapped : fallbackRows, database: true };
  } catch {
    return { rows: fallbackRows, database: false };
  }
}

export async function getGamesArchive(): Promise<{ rows: GameArchiveRow[]; database: boolean }> {
  return getArchiveByType("postseason", postseasonFallback);
}

export async function getClassicGamesArchive(): Promise<{ rows: GameArchiveRow[]; database: boolean }> {
  return getArchiveByType("regular-season-classic", classicFallback);
}

export async function getRivalrySeriesArchive(): Promise<{ rows: GameArchiveRow[]; database: boolean }> {
  return getArchiveByType("rivalry-series", rivalryFallback);
}

export async function getGameExhibit(slug: string): Promise<GameExhibit | null> {
  const fallbackRow = fallback.find(row => row.slug === slug);
  const fallbackLinks = fallbackRow ? fallbackRelated(fallbackRow) : [];
  if (!databaseConfigured() || !(await ensureDatabaseReady())) return fallbackRow ? { ...fallbackRow, related: fallbackLinks, database: false } : null;
  try {
    const sql = db();
    const rows = await sql<Array<{ id: string; slug: string; start_date: unknown; metadata: Record<string, unknown> }>>`
      select id, slug, start_date, metadata from entities
      where entity_type = 'game' and slug = ${slug}
      limit 1
    `;
    const row = rows[0];
    if (!row) return fallbackRow ? { ...fallbackRow, related: fallbackLinks, database: false } : null;
    const relatedRows = await sql<Array<{ slug: string; display_name: string; entity_type: string; relation_type: string }>>`
      select e.slug, e.display_name, e.entity_type, r.relation_type
      from relations r join entities e on e.id = r.to_entity_id
      where r.from_entity_id = ${row.id}
      union all
      select e.slug, e.display_name, e.entity_type, r.relation_type
      from relations r join entities e on e.id = r.from_entity_id
      where r.to_entity_id = ${row.id} and r.relation_type = 'moment_of_game'
      order by relation_type, display_name
    `;
    const base = mapRow(row);
    return {
      ...base,
      related: relatedRows.map(item => {
        if (item.entity_type === "moment") return { slug: item.slug, name: item.display_name, relation: "Archive moment", href: `/moments/${item.slug}` };
        if (item.entity_type === "championship") return { slug: item.slug, name: item.display_name, relation: "Championship record", href: `/championships/${item.slug}` };
        if (item.entity_type === "rivalry") return { slug: item.slug, name: item.display_name, relation: "Rivalry", href: `/rivalries/${item.slug}` };
        if (item.entity_type === "venue") return { slug: item.slug, name: item.display_name, relation: "Venue", href: `/venues/${item.slug}` };
        return { slug: item.slug, name: item.display_name, relation: "Season", href: `/seasons/${item.slug.replace(/^season-/, "")}` };
      }),
      database: true
    };
  } catch {
    return fallbackRow ? { ...fallbackRow, related: fallbackLinks, database: false } : null;
  }
}
