import fallbackGames from "@/data/games.json";
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
  sourceLabel: string;
  sourceUrl: string;
}

export interface GameExhibit extends GameArchiveRow {
  related: Array<{ slug: string; name: string; relation: string; href: string }>;
  database: boolean;
}

const fallback = fallbackGames as GameArchiveRow[];

function fallbackRelated(slug: string) {
  return moments.filter(moment => moment.gameSlug === slug).map(moment => ({
    slug: moment.slug,
    name: moment.title,
    relation: "Archive moment",
    href: `/moments/${moment.slug}`
  }));
}

export async function getGamesArchive(): Promise<{ rows: GameArchiveRow[]; database: boolean }> {
  if (!databaseConfigured() || !(await ensureDatabaseReady())) return { rows: fallback, database: false };
  try {
    const sql = db();
    const rows = await sql<Array<{ slug: string; start_date: string; metadata: Record<string, unknown> }>>`
      select slug, start_date, metadata from entities
      where entity_type = 'game' and metadata ->> 'gameType' = 'postseason'
      order by start_date
    `;
    const mapped = rows.map(row => ({
      slug: row.slug,
      season: Number(row.metadata.season),
      date: String(row.start_date),
      round: String(row.metadata.round),
      opponent: String(row.metadata.opponent),
      result: String(row.metadata.result) as "W" | "L",
      raidersScore: Number(row.metadata.raidersScore),
      opponentScore: Number(row.metadata.opponentScore),
      site: String(row.metadata.site) as GameArchiveRow["site"],
      overtime: Boolean(row.metadata.overtime),
      sourceLabel: String(row.metadata.sourceLabel ?? "Pro Football Reference"),
      sourceUrl: String(row.metadata.sourceUrl ?? "https://www.pro-football-reference.com/teams/rai/playoffs.htm")
    }));
    return { rows: mapped.length ? mapped : fallback, database: true };
  } catch {
    return { rows: fallback, database: false };
  }
}

export async function getGameExhibit(slug: string): Promise<GameExhibit | null> {
  const fallbackRow = fallback.find(row => row.slug === slug);
  const fallbackLinks = fallbackRelated(slug);
  if (!databaseConfigured() || !(await ensureDatabaseReady())) return fallbackRow ? { ...fallbackRow, related: fallbackLinks, database: false } : null;
  try {
    const sql = db();
    const rows = await sql<Array<{ id: string; slug: string; start_date: string; metadata: Record<string, unknown> }>>`
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
    const base: GameArchiveRow = {
      slug: row.slug,
      season: Number(row.metadata.season),
      date: String(row.start_date),
      round: String(row.metadata.round),
      opponent: String(row.metadata.opponent),
      result: String(row.metadata.result) as "W" | "L",
      raidersScore: Number(row.metadata.raidersScore),
      opponentScore: Number(row.metadata.opponentScore),
      site: String(row.metadata.site) as GameArchiveRow["site"],
      overtime: Boolean(row.metadata.overtime),
      sourceLabel: String(row.metadata.sourceLabel ?? "Pro Football Reference"),
      sourceUrl: String(row.metadata.sourceUrl ?? "https://www.pro-football-reference.com/teams/rai/playoffs.htm")
    };
    return {
      ...base,
      related: relatedRows.map(item => ({
        slug: item.slug,
        name: item.display_name,
        relation: item.relation_type === "game_of_season" ? "Season" : item.relation_type === "moment_of_game" ? "Archive moment" : "Championship record",
        href: item.entity_type === "moment" ? `/moments/${item.slug}` : item.entity_type === "championship" ? `/championships/${item.slug}` : "/seasons"
      })),
      database: true
    };
  } catch {
    return fallbackRow ? { ...fallbackRow, related: fallbackLinks, database: false } : null;
  }
}
