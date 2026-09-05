import { databaseConfigured, db } from "@/lib/db";
import type { CoverageItem } from "@/lib/types";

export async function persistCoverage(items: CoverageItem[]): Promise<void> {
  if (!databaseConfigured() || !items.length) return;
  try {
    const sql = db();
    await sql.begin(async tx => {
      for (const item of items) {
        await tx`
          insert into external_items (source_id, external_key, item_type, title, canonical_url, publisher, published_at, metadata, last_seen_at)
          values (${item.sourceId}, ${item.id}, ${item.type}, ${item.title}, ${item.url}, ${item.publisher}, ${item.publishedAt}, ${tx.json({ description: item.description })}, now())
          on conflict (source_id, external_key) do update set
            title = excluded.title,
            canonical_url = excluded.canonical_url,
            publisher = excluded.publisher,
            published_at = excluded.published_at,
            metadata = excluded.metadata,
            last_seen_at = now()
        `;
      }
    });
  } catch {
    // Database persistence is additive; feed rendering must still work if DB is unavailable.
  }
}

export async function storedCoverage(limit = 30): Promise<CoverageItem[]> {
  if (!databaseConfigured()) return [];
  try {
    const sql = db();
    const rows = await sql<Array<{
      source_id: string;
      external_key: string;
      item_type: "article" | "podcast";
      title: string;
      canonical_url: string;
      publisher: string;
      published_at: string | null;
      metadata: Record<string, unknown>;
      featured: boolean;
    }>>`
      select source_id, external_key, item_type, title, canonical_url, publisher, published_at, metadata, featured
      from external_items
      where hidden = false and item_type in ('article','podcast')
      order by published_at desc nulls last
      limit ${limit}
    `;
    return rows.map(row => ({
      id: row.external_key,
      type: row.item_type,
      title: row.title,
      publisher: row.publisher,
      publishedAt: row.published_at ? new Date(row.published_at).toISOString() : new Date().toISOString(),
      url: row.canonical_url,
      description: String(row.metadata?.description ?? `Open at ${row.publisher}.`),
      sourceId: row.source_id,
      featured: row.featured
    }));
  } catch {
    return [];
  }
}
