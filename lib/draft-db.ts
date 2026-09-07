import rawDraft from "@/data/draft-history.json";
import { databaseConfigured, db, ensureDatabaseReady } from "@/lib/db";

export interface DraftPickRecord {
  year: number;
  round: number | null;
  roundLabel?: string;
  pick: number | null;
  player: string;
  position?: string;
  college?: string;
  note?: string;
  vaultSlug?: string;
}

export interface DraftArchive {
  sourceLabel: string;
  sourceUrl: string;
  historySourceLabel: string;
  historySourceUrl: string;
  checked: string;
  facts: Array<{ label: string; value: string; detail: string }>;
  currentClass: { year: number; picks: DraftPickRecord[] };
  hallOfFamePicks: DraftPickRecord[];
  database: boolean;
}

type RawDraft = Omit<DraftArchive, "database">;
const fallback = rawDraft as RawDraft;

export function draftPickHref(pick: DraftPickRecord) {
  return pick.vaultSlug ? `/legends/${pick.vaultSlug}` : null;
}

export async function getDraftArchive(): Promise<DraftArchive> {
  if (!databaseConfigured() || !(await ensureDatabaseReady())) return { ...fallback, database: false };
  try {
    const sql = db();
    const rows = await sql<Array<{ metadata: Record<string, unknown> }>>`
      select metadata from entities
      where entity_type = 'draft_pick'
      order by (metadata ->> 'year')::int desc, coalesce((metadata ->> 'pick')::int, 9999), display_name
    `;
    if (!rows.length) return { ...fallback, database: true };

    const currentPicks: DraftPickRecord[] = [];
    const hallPicks: DraftPickRecord[] = [];
    for (const row of rows) {
      const m = row.metadata ?? {};
      const pick: DraftPickRecord = {
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
      if (m.collection === "current-class") currentPicks.push(pick);
      if (m.collection === "hall-of-fame") hallPicks.push(pick);
    }

    return {
      ...fallback,
      currentClass: { year: fallback.currentClass.year, picks: currentPicks.length ? currentPicks : fallback.currentClass.picks },
      hallOfFamePicks: hallPicks.length ? hallPicks : fallback.hallOfFamePicks,
      database: true
    };
  } catch {
    return { ...fallback, database: false };
  }
}
