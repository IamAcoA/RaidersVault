import rawModernDraft from "@/data/draft-2020-2026.json";
import { databaseConfigured, db, ensureDatabaseReady } from "@/lib/db";
import type { DraftPickRecord } from "@/lib/draft-db";

interface ModernDraftYear {
  year: number;
  picks: DraftPickRecord[];
}

interface ModernDraftData {
  sourceLabel: string;
  sourceUrl: string;
  checked: string;
  years: ModernDraftYear[];
}

export interface DraftYearExhibit extends ModernDraftYear {
  sourceLabel: string;
  sourceUrl: string;
  checked: string;
  database: boolean;
}

const modern = rawModernDraft as ModernDraftData;

export function modernDraftYears() {
  return modern.years.map(item => item.year);
}

export function getModernDraftIndex() {
  return modern.years.map(item => ({ year: item.year, pickCount: item.picks.length, firstPick: item.picks[0] }));
}

export async function getDraftYear(year: number): Promise<DraftYearExhibit | null> {
  const fallback = modern.years.find(item => item.year === year);
  if (!fallback) return null;
  if (!databaseConfigured() || !(await ensureDatabaseReady())) {
    return { ...fallback, sourceLabel: modern.sourceLabel, sourceUrl: modern.sourceUrl, checked: modern.checked, database: false };
  }

  try {
    const sql = db();
    const rows = await sql<Array<{ metadata: Record<string, unknown> }>>`
      select metadata
      from entities
      where entity_type = 'draft_pick' and (metadata ->> 'year')::int = ${year}
      order by coalesce((metadata ->> 'pick')::int, 9999), display_name
    `;
    if (!rows.length) {
      return { ...fallback, sourceLabel: modern.sourceLabel, sourceUrl: modern.sourceUrl, checked: modern.checked, database: true };
    }

    const picks: DraftPickRecord[] = rows.map(row => {
      const m = row.metadata ?? {};
      return {
        year: Number(m.year),
        round: m.round == null ? null : Number(m.round),
        pick: m.pick == null ? null : Number(m.pick),
        player: String(m.player ?? ""),
        position: m.position ? String(m.position) : undefined,
        college: m.college ? String(m.college) : undefined,
        note: m.note ? String(m.note) : undefined,
        vaultSlug: m.vaultSlug ? String(m.vaultSlug) : undefined
      };
    });

    return { year, picks, sourceLabel: modern.sourceLabel, sourceUrl: modern.sourceUrl, checked: modern.checked, database: true };
  } catch {
    return { ...fallback, sourceLabel: modern.sourceLabel, sourceUrl: modern.sourceUrl, checked: modern.checked, database: false };
  }
}
