import fallback from "@/data/legends.json";
import { databaseConfigured, db, ensureDatabaseReady } from "@/lib/db";

export interface LegendArchiveRow {
  slug: string;
  name: string;
  role: "player" | "coach" | "executive";
  collection: string;
  sourceLabel: string;
  sourceUrl: string;
  details?: string;
}

export async function getLegendsArchive(): Promise<{ rows: LegendArchiveRow[]; database: boolean }> {
  const fallbackRows = fallback as LegendArchiveRow[];
  if (!databaseConfigured() || !(await ensureDatabaseReady())) return { rows: fallbackRows, database: false };

  try {
    const sql = db();
    const rows = await sql<Array<{ slug: string; display_name: string; entity_type: string; metadata: Record<string, unknown> }>>`
      select slug, display_name, entity_type, metadata
      from entities
      where metadata ->> 'collection' = 'Pro Football Hall of Fame'
      order by display_name
    `;

    const mapped = rows.map(row => ({
      slug: row.slug,
      name: row.display_name,
      role: (row.metadata.role ?? row.entity_type) as LegendArchiveRow["role"],
      collection: String(row.metadata.collection ?? "Pro Football Hall of Fame"),
      sourceLabel: String(row.metadata.sourceLabel ?? "Pro Football Hall of Fame"),
      sourceUrl: String(row.metadata.sourceUrl ?? "https://www.profootballhof.com/teams/las-vegas-raiders/team-greats"),
      details: row.metadata.position || row.metadata.years
        ? [row.metadata.position, row.metadata.years].filter(Boolean).join(" · ")
        : undefined
    }));

    return { rows: mapped.length ? mapped : fallbackRows, database: true };
  } catch {
    return { rows: fallbackRows, database: false };
  }
}
