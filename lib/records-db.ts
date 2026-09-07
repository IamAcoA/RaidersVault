import rawRecords from "@/data/records.json";
import { databaseConfigured, db, ensureDatabaseReady } from "@/lib/db";

export interface RecordLeader {
  rank: number;
  name: string;
  value: string;
  detail: string;
  vaultSlug?: string;
  vaultType?: "legend" | "player";
}

export interface RecordCategory {
  slug: string;
  title: string;
  stat: string;
  note?: string;
  leaders: RecordLeader[];
}

export interface FranchiseSnapshotItem {
  label: string;
  value: string;
  detail: string;
  vaultSlug?: string;
  vaultType?: "legend" | "player";
}

export interface RecordsArchive {
  sourceLabel: string;
  sourceUrl: string;
  snapshotSourceLabel: string;
  snapshotSourceUrl: string;
  checked: string;
  snapshot: FranchiseSnapshotItem[];
  categories: RecordCategory[];
  database: boolean;
}

type RawRecords = Omit<RecordsArchive, "database">;
const fallback = rawRecords as RawRecords;

export function recordHref(item: { vaultSlug?: string; vaultType?: "legend" | "player" }) {
  if (!item.vaultSlug || !item.vaultType) return null;
  return item.vaultType === "player" ? `/players/${item.vaultSlug}` : `/legends/${item.vaultSlug}`;
}

export async function getRecordsArchive(): Promise<RecordsArchive> {
  if (!databaseConfigured() || !(await ensureDatabaseReady())) return { ...fallback, database: false };

  try {
    const sql = db();
    const rows = await sql<Array<{ slug: string; metadata: Record<string, unknown> }>>`
      select slug, metadata
      from entities
      where entity_type = 'record'
      order by slug
    `;
    if (!rows.length) return { ...fallback, database: true };

    const snapshotRow = rows.find(row => row.slug === "record-franchise-snapshot");
    const categoryRows = new Map(rows.filter(row => row.slug !== "record-franchise-snapshot").map(row => [row.slug.replace(/^record-/, ""), row]));

    const snapshot = Array.isArray(snapshotRow?.metadata?.items)
      ? snapshotRow!.metadata.items as unknown as FranchiseSnapshotItem[]
      : fallback.snapshot;

    const categories = fallback.categories.map(category => {
      const row = categoryRows.get(category.slug);
      const metadata = row?.metadata ?? {};
      return {
        slug: category.slug,
        title: String(metadata.title ?? category.title),
        stat: String(metadata.stat ?? category.stat),
        note: metadata.note ? String(metadata.note) : category.note,
        leaders: Array.isArray(metadata.leaders) ? metadata.leaders as unknown as RecordLeader[] : category.leaders
      };
    });

    return { ...fallback, snapshot, categories, database: true };
  } catch {
    return { ...fallback, database: false };
  }
}
