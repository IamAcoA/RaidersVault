import rawModernDraft from "@/data/draft-2020-2026.json";
import raw2014to2019 from "@/data/draft-2014-2019.json";
import { databaseConfigured, db, ensureDatabaseReady } from "@/lib/db";
import type { DraftPickRecord } from "@/lib/draft-db";

interface DraftYear {
  year: number;
  picks: DraftPickRecord[];
}

interface DraftYearData {
  sourceLabel: string;
  sourceUrl: string;
  checked: string;
  years: DraftYear[];
}

export interface DraftYearExhibit extends DraftYear {
  sourceLabel: string;
  sourceUrl: string;
  checked: string;
  database: boolean;
}

const modern = rawModernDraft as DraftYearData;
const older = raw2014to2019 as DraftYearData;
const allYears = [...modern.years, ...older.years].sort((a, b) => b.year - a.year);

export function draftYears() {
  return allYears.map(item => item.year);
}

export function getDraftIndex() {
  return allYears.map(item => ({ year: item.year, pickCount: item.picks.length, firstPick: item.picks[0] }));
}

function fallbackSource(year: number) {
  return year >= 2020 ? modern : older;
}

export async function getDraftYear(year: number): Promise<DraftYearExhibit | null> {
  const fallback = allYears.find(item => item.year === year);
  if (!fallback) return null;
  const source = fallbackSource(year);
  if (!databaseConfigured() || !(await ensureDatabaseReady())) {
    return { ...fallback, sourceLabel: source.sourceLabel, sourceUrl: source.sourceUrl, checked: source.checked, database: false };
  }

  try {
    const sql = db();
    const rows = await sql<Array<{ metadata: Record<string, unknown> }>>`
      select metadata
      from entities
      where entity_type = 'draft_pick' and (metadata ->> 'year')::int = ${year}
      order by coalesce((metadata ->> 'round')::int, 9999), coalesce(metadata ->> 'roundLabel', ''), coalesce((metadata ->> 'pick')::int, 9999), display_name
    `;
    if (!rows.length) {
      return { ...fallback, sourceLabel: source.sourceLabel, sourceUrl: source.sourceUrl, checked: source.checked, database: true };
    }

    const picks: DraftPickRecord[] = rows.map(row => {
      const m = row.metadata ?? {};
      return {
        year: Number(m.year),
        round: m.round == null ? null : Number(m.round),
        roundLabel: m.roundLabel ? String(m.roundLabel) : undefined,
        pick: m.pick == null ? null : Number(m.pick),
        player: String(m.player ?? ""),
        position: m.position ? String(m.position) : undefined,
        college: m.college ? String(m.college) : undefined,
        note: m.note ? String(m.note) : undefined,
        vaultSlug: m.vaultSlug ? String(m.vaultSlug) : undefined
      };
    });

    return { year, picks, sourceLabel: source.sourceLabel, sourceUrl: source.sourceUrl, checked: source.checked, database: true };
  } catch {
    return { ...fallback, sourceLabel: source.sourceLabel, sourceUrl: source.sourceUrl, checked: source.checked, database: false };
  }
}
