import rawPlayers from "@/data/players.json";
import { databaseConfigured, db, ensureDatabaseReady } from "@/lib/db";

interface SourceBackedPlayer {
  slug: string;
  name: string;
  position: string;
  years: string;
  number?: string;
  distinction: string;
  sourceLabel?: string;
  sourceUrl?: string;
}

export interface PlayerExhibit extends SourceBackedPlayer {
  related: Array<{ slug: string; name: string; relation: string; href: string }>;
  database: boolean;
}

const players = rawPlayers as SourceBackedPlayer[];

function fallback(slug: string): PlayerExhibit | null {
  const player = players.find(item => item.slug === slug && item.sourceUrl);
  if (!player) return null;
  return { ...player, related: [], database: false };
}

export async function getPlayerExhibit(slug: string): Promise<PlayerExhibit | null> {
  const fallbackRecord = fallback(slug);
  if (!databaseConfigured() || !(await ensureDatabaseReady())) return fallbackRecord;
  try {
    const sql = db();
    const rows = await sql<Array<{ id: string; slug: string; display_name: string; metadata: Record<string, unknown> }>>`
      select id, slug, display_name, metadata
      from entities
      where slug = ${slug} and entity_type = 'player'
      limit 1
    `;
    const row = rows[0];
    if (!row || !row.metadata.sourceUrl) return fallbackRecord;
    const related = await sql<Array<{ slug: string; display_name: string; relation_type: string }>>`
      select e.slug, e.display_name, r.relation_type
      from relations r
      join entities e on e.id = r.from_entity_id
      where r.to_entity_id = ${row.id} and e.entity_type = 'championship'
      order by e.start_date
    `;
    return {
      slug: row.slug,
      name: row.display_name,
      position: String(row.metadata.position ?? ""),
      years: String(row.metadata.years ?? ""),
      number: row.metadata.number ? String(row.metadata.number) : undefined,
      distinction: String(row.metadata.distinction ?? ""),
      sourceLabel: String(row.metadata.sourceLabel ?? "Source"),
      sourceUrl: String(row.metadata.sourceUrl),
      related: related.map(item => ({
        slug: item.slug,
        name: item.display_name,
        relation: item.relation_type === "championship_mvp" ? "Championship MVP" : item.relation_type,
        href: `/championships/${item.slug}`
      })),
      database: true
    };
  } catch {
    return fallbackRecord;
  }
}

export const sourceBackedPlayerSlugs = players.filter(item => item.sourceUrl).map(item => item.slug);
