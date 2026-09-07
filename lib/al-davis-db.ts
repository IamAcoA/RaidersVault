import rawCollection from "@/data/al-davis-collection.json";
import { databaseConfigured, db, ensureDatabaseReady } from "@/lib/db";

export interface AlDavisMilestoneLink {
  label: string;
  href: string;
}

export interface AlDavisMilestone {
  slug: string;
  date: string;
  year: number;
  title: string;
  summary: string;
  sourceLabel: string;
  sourceUrl: string;
  links: AlDavisMilestoneLink[];
}

export interface AlDavisCollection {
  slug: string;
  title: string;
  subtitle: string;
  lifespan: string;
  summary: string;
  sourceLabel: string;
  sourceUrl: string;
  hallOfFameUrl: string;
  timelineUrl: string;
  milestones: AlDavisMilestone[];
  database: boolean;
}

type RawMilestone = Omit<AlDavisMilestone, "slug">;
type RawCollection = Omit<AlDavisCollection, "milestones" | "database"> & { milestones: RawMilestone[] };

const collection = rawCollection as RawCollection;

function slugify(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

function milestoneSlug(item: RawMilestone) {
  return `al-davis-${item.year}-${slugify(item.title)}`;
}

function dateToIso(value: unknown): string {
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  return String(value ?? "").slice(0, 10);
}

function fallbackCollection(): AlDavisCollection {
  return {
    ...collection,
    milestones: collection.milestones.map(item => ({ ...item, slug: milestoneSlug(item) })),
    database: false
  };
}

export async function getAlDavisCollection(): Promise<AlDavisCollection> {
  const fallback = fallbackCollection();
  if (!databaseConfigured() || !(await ensureDatabaseReady())) return fallback;

  try {
    const sql = db();
    const people = await sql<Array<{ id: string; metadata: Record<string, unknown> }>>`
      select id, metadata
      from entities
      where slug = 'al-davis'
      limit 1
    `;
    const person = people[0];
    if (!person) return fallback;

    const rows = await sql<Array<{
      slug: string;
      display_name: string;
      start_date: unknown;
      metadata: Record<string, unknown>;
    }>>`
      select e.slug, e.display_name, e.start_date, e.metadata
      from relations r
      join entities e on e.id = r.from_entity_id
      where r.to_entity_id = ${person.id}
        and r.relation_type = 'al_davis_milestone'
        and e.entity_type = 'event'
      order by e.start_date, e.display_name
    `;

    if (!rows.length) return { ...fallback, database: true };
    const metadata = person.metadata ?? {};
    return {
      slug: collection.slug,
      title: String(metadata.collectionTitle ?? collection.title),
      subtitle: String(metadata.collectionSubtitle ?? collection.subtitle),
      lifespan: String(metadata.collectionLifespan ?? collection.lifespan),
      summary: String(metadata.collectionSummary ?? collection.summary),
      sourceLabel: collection.sourceLabel,
      sourceUrl: collection.sourceUrl,
      hallOfFameUrl: collection.hallOfFameUrl,
      timelineUrl: collection.timelineUrl,
      milestones: rows.map(row => {
        const item = row.metadata ?? {};
        const links = Array.isArray(item.links)
          ? item.links.flatMap(link => {
              if (!link || typeof link !== "object") return [];
              const record = link as Record<string, unknown>;
              if (!record.label || !record.href) return [];
              return [{ label: String(record.label), href: String(record.href) }];
            })
          : [];
        return {
          slug: row.slug,
          date: dateToIso(row.start_date),
          year: Number(item.year ?? dateToIso(row.start_date).slice(0, 4)),
          title: row.display_name,
          summary: String(item.summary ?? ""),
          sourceLabel: String(item.sourceLabel ?? collection.sourceLabel),
          sourceUrl: String(item.sourceUrl ?? collection.sourceUrl),
          links
        };
      }),
      database: true
    };
  } catch {
    return fallback;
  }
}
