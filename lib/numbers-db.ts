import rawNumbers from "@/data/numbers.json";
import { databaseConfigured, db, ensureDatabaseReady } from "@/lib/db";

export interface NumberWearer {
  name: string;
  from: number;
  to: number;
  vaultSlug?: string;
}

export interface NumberRecord {
  number: string;
  sourceLabel: string;
  sourceUrl: string;
  wearerCount: number;
  sourceChecked: string;
  wearers: NumberWearer[];
}

export interface NumberExhibit extends NumberRecord {
  database: boolean;
}

const numbers = rawNumbers as NumberRecord[];

export function numberSlugs() {
  return numbers.map(item => item.number);
}

export function wearerHref(wearer: NumberWearer) {
  if (!wearer.vaultSlug) return null;
  return wearer.vaultSlug === "jim-plunkett" ? `/players/${wearer.vaultSlug}` : `/legends/${wearer.vaultSlug}`;
}

function sortedWearers(wearers: NumberWearer[]) {
  return [...wearers].sort((a, b) => a.from - b.from || a.to - b.to || a.name.localeCompare(b.name));
}

function fallback(number: string): NumberExhibit | null {
  const record = numbers.find(item => item.number === number);
  return record ? { ...record, wearers: sortedWearers(record.wearers), database: false } : null;
}

export async function getNumberArchive(): Promise<{ rows: NumberRecord[]; database: boolean }> {
  if (!databaseConfigured() || !(await ensureDatabaseReady())) {
    return { rows: numbers, database: false };
  }
  try {
    const sql = db();
    const rows = await sql<Array<{ slug: string; metadata: Record<string, unknown> }>>`
      select slug, metadata
      from entities
      where entity_type = 'number'
      order by lpad(metadata ->> 'number', 3, '0')
    `;
    if (!rows.length) return { rows: numbers, database: true };
    return {
      rows: rows.map(row => {
        const metadata = row.metadata ?? {};
        const wearers = Array.isArray(metadata.wearers) ? metadata.wearers as NumberWearer[] : [];
        return {
          number: String(metadata.number ?? row.slug.replace(/^number-/, "")),
          sourceLabel: String(metadata.sourceLabel ?? "Pro Football Reference"),
          sourceUrl: String(metadata.sourceUrl ?? ""),
          wearerCount: Number(metadata.wearerCount ?? wearers.length),
          sourceChecked: String(metadata.sourceChecked ?? ""),
          wearers
        };
      }),
      database: true
    };
  } catch {
    return { rows: numbers, database: false };
  }
}

export async function getNumberExhibit(number: string): Promise<NumberExhibit | null> {
  const fallbackRecord = fallback(number);
  if (!fallbackRecord || !databaseConfigured() || !(await ensureDatabaseReady())) return fallbackRecord;

  try {
    const sql = db();
    const rows = await sql<Array<{ metadata: Record<string, unknown> }>>`
      select metadata
      from entities
      where entity_type = 'number' and slug = ${`number-${number}`}
      limit 1
    `;
    const row = rows[0];
    if (!row) return fallbackRecord;
    const metadata = row.metadata ?? {};
    const wearers = Array.isArray(metadata.wearers) ? metadata.wearers as NumberWearer[] : fallbackRecord.wearers;
    return {
      number,
      sourceLabel: String(metadata.sourceLabel ?? fallbackRecord.sourceLabel),
      sourceUrl: String(metadata.sourceUrl ?? fallbackRecord.sourceUrl),
      wearerCount: Number(metadata.wearerCount ?? wearers.length),
      sourceChecked: String(metadata.sourceChecked ?? fallbackRecord.sourceChecked),
      wearers: sortedWearers(wearers),
      database: true
    };
  } catch {
    return fallbackRecord;
  }
}
