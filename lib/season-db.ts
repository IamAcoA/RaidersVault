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

function fallbackRows(): SeasonArchiveRow[] {
  const details = new Map(detailedSeasons.map(season => [season.year, season]));
  const rows: SeasonArchiveRow[] = [];
  for (let year = currentFranchiseSeasonYear(); year >= 1960; year -= 1) {
    const detail = details.get(year);
    const location = locationForSeason(year);
    rows.push({
      year,
      location,
      record: detail?.record ?? "",
      coach: detail?.coach ?? "",
      finish: detail?.finish ?? "",
      note: detail?.note ?? "Season indexed; detailed facts pending verification.",
      status: detail ? "verified-detail" : "indexed"
    });
  }
  return rows;
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
