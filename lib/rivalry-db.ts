import classicGames from "@/data/classic-games.json";
import postseasonGames from "@/data/games.json";
import moments from "@/data/moments.json";
import rawRivalries from "@/data/rivalries.json";
import { databaseConfigured, db, ensureDatabaseReady } from "@/lib/db";

export interface RivalryRecord {
  slug: string;
  name: string;
  shortName: string;
  kind: string;
  startYear: number;
  seriesRecord: string;
  postseasonRecord?: string;
  seriesThrough: number;
  summary: string;
  aliases: string[];
  sourceLabel: string;
  sourceUrl: string;
  historyUrl: string;
}

export interface RivalryGame {
  slug: string;
  season: number;
  date: string;
  round: string;
  opponent: string;
  result: "W" | "L";
  raidersScore: number;
  opponentScore: number;
  site: string;
  nickname?: string;
}

export interface RivalryExhibit extends RivalryRecord {
  indexedGames: RivalryGame[];
  relatedMoments: Array<{ slug: string; title: string; date: string }>;
  database: boolean;
}

const rivalries = rawRivalries as RivalryRecord[];
const allGames = [...postseasonGames, ...classicGames];

function fallbackExhibit(slug: string): RivalryExhibit | null {
  const rivalry = rivalries.find(item => item.slug === slug);
  if (!rivalry) return null;
  const aliases = new Set(rivalry.aliases);
  const indexedGames: RivalryGame[] = allGames
    .filter(game => aliases.has(game.opponent))
    .map(game => ({
      slug: game.slug,
      season: game.season,
      date: game.date,
      round: game.round,
      opponent: game.opponent,
      result: game.result as "W" | "L",
      raidersScore: game.raidersScore,
      opponentScore: game.opponentScore,
      site: game.site,
      nickname: "nickname" in game ? String(game.nickname ?? "") || undefined : undefined
    }))
    .sort((a, b) => b.date.localeCompare(a.date));
  const gameSlugs = new Set(indexedGames.map(game => game.slug));
  const relatedMoments = moments
    .filter(moment => moment.gameSlug && gameSlugs.has(moment.gameSlug))
    .map(moment => ({ slug: moment.slug, title: moment.title, date: moment.date }));
  return { ...rivalry, indexedGames, relatedMoments, database: false };
}

export function rivalrySlugs() {
  return rivalries.map(item => item.slug);
}

export async function getRivalries(): Promise<{ rows: RivalryRecord[]; database: boolean }> {
  if (!databaseConfigured() || !(await ensureDatabaseReady())) return { rows: rivalries, database: false };
  try {
    const sql = db();
    const rows = await sql<Array<{ slug: string; display_name: string; metadata: Record<string, unknown> }>>`
      select slug, display_name, metadata
      from entities
      where entity_type = 'rivalry'
      order by display_name
    `;
    if (!rows.length) return { rows: rivalries, database: true };
    return {
      rows: rows.map(row => ({
        slug: row.slug,
        name: row.display_name,
        shortName: String(row.metadata.shortName ?? row.display_name),
        kind: String(row.metadata.kind ?? "Rivalry"),
        startYear: Number(row.metadata.startYear),
        seriesRecord: String(row.metadata.seriesRecord ?? ""),
        postseasonRecord: row.metadata.postseasonRecord ? String(row.metadata.postseasonRecord) : undefined,
        seriesThrough: Number(row.metadata.seriesThrough),
        summary: String(row.metadata.summary ?? ""),
        aliases: Array.isArray(row.metadata.aliases) ? row.metadata.aliases.map(String) : [],
        sourceLabel: String(row.metadata.sourceLabel ?? "Las Vegas Raiders"),
        sourceUrl: String(row.metadata.sourceUrl ?? ""),
        historyUrl: String(row.metadata.historyUrl ?? row.metadata.sourceUrl ?? "")
      })),
      database: true
    };
  } catch {
    return { rows: rivalries, database: false };
  }
}

export async function getRivalryExhibit(slug: string): Promise<RivalryExhibit | null> {
  const fallback = fallbackExhibit(slug);
  if (!fallback || !databaseConfigured() || !(await ensureDatabaseReady())) return fallback;
  try {
    const sql = db();
    const rows = await sql<Array<{ id: string; slug: string; display_name: string; metadata: Record<string, unknown> }>>`
      select id, slug, display_name, metadata
      from entities
      where entity_type = 'rivalry' and slug = ${slug}
      limit 1
    `;
    const row = rows[0];
    if (!row) return fallback;
    const games = await sql<Array<{ slug: string; start_date: string; metadata: Record<string, unknown> }>>`
      select e.slug, e.start_date, e.metadata
      from relations r join entities e on e.id = r.to_entity_id
      where r.from_entity_id = ${row.id} and r.relation_type = 'rivalry_game'
      order by e.start_date desc
    `;
    const momentRows = await sql<Array<{ slug: string; display_name: string; start_date: string }>>`
      select e.slug, e.display_name, e.start_date
      from relations r join entities e on e.id = r.to_entity_id
      where r.from_entity_id = ${row.id} and r.relation_type = 'rivalry_moment'
      order by e.start_date
    `;
    const metadata = row.metadata ?? {};
    return {
      slug: row.slug,
      name: row.display_name,
      shortName: String(metadata.shortName ?? row.display_name),
      kind: String(metadata.kind ?? "Rivalry"),
      startYear: Number(metadata.startYear),
      seriesRecord: String(metadata.seriesRecord ?? ""),
      postseasonRecord: metadata.postseasonRecord ? String(metadata.postseasonRecord) : undefined,
      seriesThrough: Number(metadata.seriesThrough),
      summary: String(metadata.summary ?? ""),
      aliases: Array.isArray(metadata.aliases) ? metadata.aliases.map(String) : [],
      sourceLabel: String(metadata.sourceLabel ?? "Las Vegas Raiders"),
      sourceUrl: String(metadata.sourceUrl ?? ""),
      historyUrl: String(metadata.historyUrl ?? metadata.sourceUrl ?? ""),
      indexedGames: games.map(game => ({
        slug: game.slug,
        season: Number(game.metadata.season),
        date: String(game.start_date),
        round: String(game.metadata.round),
        opponent: String(game.metadata.opponent),
        result: String(game.metadata.result) as "W" | "L",
        raidersScore: Number(game.metadata.raidersScore),
        opponentScore: Number(game.metadata.opponentScore),
        site: String(game.metadata.site),
        nickname: game.metadata.nickname ? String(game.metadata.nickname) : undefined
      })),
      relatedMoments: momentRows.map(moment => ({ slug: moment.slug, title: moment.display_name, date: moment.start_date })),
      database: true
    };
  } catch {
    return fallback;
  }
}
