import fallback from "@/data/championships.json";
import { databaseConfigured, db, ensureDatabaseReady } from "@/lib/db";

export interface ChampionshipArchiveRow {
  slug: string;
  name: string;
  season: number;
  date: string;
  teamName: string;
  opponent: string;
  score: string;
  level: "league" | "world";
  mvp?: string;
  summary: string;
  sourceLabel: string;
  sourceUrl: string;
}

export async function getChampionshipArchive(): Promise<{ rows: ChampionshipArchiveRow[]; database: boolean }> {
  const fallbackRows = fallback as ChampionshipArchiveRow[];
  if (!databaseConfigured() || !(await ensureDatabaseReady())) return { rows: fallbackRows, database: false };

  try {
    const sql = db();
    const rows = await sql<Array<{ slug: string; display_name: string; start_date: string; metadata: Record<string, unknown> }>>`
      select slug, display_name, start_date, metadata
      from entities
      where entity_type = 'championship'
      order by start_date
    `;

    const mapped = rows.map(row => ({
      slug: row.slug,
      name: row.display_name,
      season: Number(row.metadata.season),
      date: String(row.start_date),
      teamName: String(row.metadata.teamName ?? "Raiders"),
      opponent: String(row.metadata.opponent ?? ""),
      score: String(row.metadata.score ?? ""),
      level: (row.metadata.level ?? "world") as ChampionshipArchiveRow["level"],
      mvp: row.metadata.mvp ? String(row.metadata.mvp) : undefined,
      summary: String(row.metadata.summary ?? ""),
      sourceLabel: String(row.metadata.sourceLabel ?? "Source"),
      sourceUrl: String(row.metadata.sourceUrl ?? "")
    }));

    return { rows: mapped.length ? mapped : fallbackRows, database: true };
  } catch {
    return { rows: fallbackRows, database: false };
  }
}
