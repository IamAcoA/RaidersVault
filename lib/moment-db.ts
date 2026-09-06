import { moments } from "@/data/moments";
import { databaseConfigured, db, ensureDatabaseReady } from "@/lib/db";

export interface MomentRelatedExhibit {
  slug: string;
  name: string;
  type: string;
  relation: string;
  href: string;
}

export interface MomentExhibit {
  slug: string;
  title: string;
  date: string;
  opponent?: string;
  summary: string;
  playDetail?: string;
  people: string[];
  tags: string[];
  sourceLabel: string;
  sourceUrl: string;
  related: MomentRelatedExhibit[];
  database: boolean;
}

function fallbackMoment(slug: string): MomentExhibit | null {
  const item = moments.find(moment => moment.slug === slug);
  if (!item) return null;
  const related: MomentRelatedExhibit[] = [];
  if (item.gameSlug) related.push({
    slug: item.gameSlug,
    name: `${item.date} vs. ${item.opponent ?? "opponent"}`,
    type: "game",
    relation: "Occurred in game",
    href: `/games/${item.gameSlug}`
  });
  if (item.championshipSlug) related.push({
    slug: item.championshipSlug,
    name: item.title,
    type: "championship",
    relation: "Championship record",
    href: `/championships/${item.championshipSlug}`
  });
  return {
    slug: item.slug,
    title: item.title,
    date: item.date,
    opponent: item.opponent,
    summary: item.summary,
    playDetail: item.playDetail,
    people: item.people ?? [],
    tags: item.tags,
    sourceLabel: item.sourceLabel ?? "Source",
    sourceUrl: item.sourceUrl ?? "",
    related,
    database: false
  };
}

function hrefFor(type: string, slug: string, metadata: Record<string, unknown>) {
  if (type === "game") return `/games/${slug}`;
  if (type === "championship") return `/championships/${slug}`;
  if (metadata.collection === "Pro Football Hall of Fame") return `/legends/${slug}`;
  if (type === "player" && metadata.sourceUrl) return `/players/${slug}`;
  return "/vault";
}

function relationLabel(relation: string) {
  if (relation === "moment_of_game") return "Occurred in game";
  if (relation === "moment_of_championship") return "Championship record";
  if (relation === "moment_person") return "Featured person";
  return relation;
}

export async function getMomentExhibit(slug: string): Promise<MomentExhibit | null> {
  const fallback = fallbackMoment(slug);
  if (!databaseConfigured() || !(await ensureDatabaseReady())) return fallback;
  try {
    const sql = db();
    const rows = await sql<Array<{ id: string; slug: string; display_name: string; start_date: string; metadata: Record<string, unknown> }>>`
      select id, slug, display_name, start_date, metadata
      from entities
      where slug = ${slug} and entity_type = 'moment'
      limit 1
    `;
    const row = rows[0];
    if (!row) return fallback;
    const relatedRows = await sql<Array<{ slug: string; display_name: string; entity_type: string; relation_type: string; metadata: Record<string, unknown> }>>`
      select e.slug, e.display_name, e.entity_type, r.relation_type, e.metadata
      from relations r
      join entities e on e.id = r.to_entity_id
      where r.from_entity_id = ${row.id}
      order by r.relation_type, e.display_name
    `;
    const people = Array.isArray(row.metadata.people) ? row.metadata.people.map(String) : [];
    const tags = Array.isArray(row.metadata.tags) ? row.metadata.tags.map(String) : [];
    return {
      slug: row.slug,
      title: row.display_name,
      date: String(row.start_date),
      opponent: row.metadata.opponent ? String(row.metadata.opponent) : undefined,
      summary: String(row.metadata.summary ?? ""),
      playDetail: row.metadata.playDetail ? String(row.metadata.playDetail) : undefined,
      people,
      tags,
      sourceLabel: String(row.metadata.sourceLabel ?? "Source"),
      sourceUrl: String(row.metadata.sourceUrl ?? ""),
      related: relatedRows.map(item => ({
        slug: item.slug,
        name: item.display_name,
        type: item.entity_type,
        relation: relationLabel(item.relation_type),
        href: hrefFor(item.entity_type, item.slug, item.metadata ?? {})
      })),
      database: true
    };
  } catch {
    return fallback;
  }
}
