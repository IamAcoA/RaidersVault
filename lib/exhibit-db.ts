import championships from "@/data/championships.json";
import classicGames from "@/data/classic-games.json";
import games from "@/data/games.json";
import legends from "@/data/legends.json";
import moments from "@/data/moments.json";
import peopleProfiles from "@/data/people-profiles.json";
import { players } from "@/data/players";
import { databaseConfigured, db, ensureDatabaseReady } from "@/lib/db";

export interface RelatedExhibit {
  slug: string;
  name: string;
  type: string;
  relation: string;
  href: string;
}

export interface RaidersRole {
  label: string;
  start: number;
  end: number;
  years?: number[];
}

interface PeopleProfile {
  slug: string;
  name: string;
  role: string;
  summary: string;
  raidersRoles: RaidersRole[];
  sourceLabel: string;
  sourceUrl: string;
  seasonRanges: number[][];
  connections: Array<{ type: string; slug: string; relation: string }>;
}

export interface LegendExhibit {
  slug: string;
  name: string;
  role: string;
  collection: string;
  sourceLabel: string;
  sourceUrl: string;
  position?: string;
  years?: string;
  number?: string;
  distinction?: string;
  summary?: string;
  raidersRoles: RaidersRole[];
  related: RelatedExhibit[];
  database: boolean;
}

export interface ChampionshipExhibit {
  slug: string;
  name: string;
  season: number;
  date: string;
  teamName: string;
  opponent: string;
  score: string;
  mvp?: string;
  summary: string;
  sourceLabel: string;
  sourceUrl: string;
  related: RelatedExhibit[];
  database: boolean;
}

const profiles = peopleProfiles as PeopleProfile[];

function profileFor(slug: string) {
  return profiles.find(item => item.slug === slug);
}

function hrefFor(type: string, slug: string, metadata: Record<string, unknown> = {}) {
  if (type === "championship") return `/championships/${slug}`;
  if (type === "game") return `/games/${slug}`;
  if (type === "moment") return `/moments/${slug}`;
  if (type === "season") return `/seasons/${slug.replace(/^season-/, "")}`;
  if (metadata.collection === "Pro Football Hall of Fame") return `/legends/${slug}`;
  if (type === "player" && metadata.sourceUrl) return `/players/${slug}`;
  return "/vault";
}

function humanizeProfileRelation(relation: string) {
  return relation
    .replace(/^profile_/, "")
    .split("_")
    .filter(Boolean)
    .map((part, index) => index === 0 ? part.charAt(0).toUpperCase() + part.slice(1) : part)
    .join(" ");
}

function labelFor(relation: string) {
  if (relation === "championship_mvp") return "Championship MVP";
  if (relation === "championship_of_season") return "Championship season";
  if (relation === "championship_game") return "Championship game";
  if (relation === "moment_person") return "Archive moment";
  if (relation.startsWith("profile_")) return humanizeProfileRelation(relation);
  return relation;
}

function fallbackConnection(item: PeopleProfile["connections"][number]): RelatedExhibit | null {
  if (item.type === "championship") {
    const record = championships.find(entry => entry.slug === item.slug);
    return record ? { slug: record.slug, name: record.name, type: "championship", relation: item.relation, href: `/championships/${record.slug}` } : null;
  }
  if (item.type === "game") {
    const record = [...games, ...classicGames].find(entry => entry.slug === item.slug);
    if (!record) return null;
    const nickname = "nickname" in record ? String(record.nickname ?? "") : "";
    return { slug: record.slug, name: nickname || `Raiders vs. ${record.opponent}`, type: "game", relation: item.relation, href: `/games/${record.slug}` };
  }
  if (item.type === "moment") {
    const record = moments.find(entry => entry.slug === item.slug);
    return record ? { slug: record.slug, name: record.title, type: "moment", relation: item.relation, href: `/moments/${record.slug}` } : null;
  }
  return null;
}

function dedupeRelated(items: RelatedExhibit[]) {
  const deduped = new Map<string, RelatedExhibit>();
  for (const item of items) deduped.set(`${item.type}:${item.slug}`, item);
  return [...deduped.values()];
}

function fallbackLegend(slug: string): LegendExhibit | null {
  const legend = legends.find(item => item.slug === slug);
  if (!legend) return null;
  const player = players.find(item => item.slug === slug);
  const profile = profileFor(slug);
  const mvpLinks = championships.flatMap(item => {
    const mvp = "mvp" in item ? item.mvp : undefined;
    return mvp === legend.name ? [{
      slug: item.slug,
      name: item.name,
      type: "championship",
      relation: "Championship MVP",
      href: `/championships/${item.slug}`
    }] : [];
  });
  const profileLinks = profile?.connections.map(fallbackConnection).filter((item): item is RelatedExhibit => Boolean(item)) ?? [];
  return {
    slug,
    name: legend.name,
    role: legend.role,
    collection: legend.collection,
    sourceLabel: profile?.sourceLabel ?? legend.sourceLabel,
    sourceUrl: profile?.sourceUrl ?? legend.sourceUrl,
    position: player?.position,
    years: player?.years,
    number: player?.number,
    distinction: player?.distinction,
    summary: profile?.summary,
    raidersRoles: profile?.raidersRoles ?? [],
    related: dedupeRelated([...profileLinks, ...mvpLinks]),
    database: false
  };
}

function fallbackChampionship(slug: string): ChampionshipExhibit | null {
  const item = championships.find(record => record.slug === slug);
  if (!item) return null;
  const mvp = "mvp" in item ? item.mvp : undefined;
  const related: RelatedExhibit[] = [{
    slug: `season-${item.season}`,
    name: `${item.season} season`,
    type: "season",
    relation: "Championship season",
    href: `/seasons/${item.season}`
  }];
  const titleGame = games.find(record => record.date === item.date);
  if (titleGame) related.push({
    slug: titleGame.slug,
    name: `Raiders vs. ${titleGame.opponent}`,
    type: "game",
    relation: "Championship game",
    href: `/games/${titleGame.slug}`
  });
  const legend = mvp ? legends.find(record => record.name === mvp) : undefined;
  if (legend) {
    related.push({ slug: legend.slug, name: legend.name, type: "legend", relation: "Championship MVP", href: `/legends/${legend.slug}` });
  } else if (mvp) {
    const player = players.find(record => record.name === mvp && record.sourceUrl);
    if (player) related.push({ slug: player.slug, name: player.name, type: "player", relation: "Championship MVP", href: `/players/${player.slug}` });
  }
  return { ...item, mvp, related, database: false } as ChampionshipExhibit;
}

export async function getLegendExhibit(slug: string): Promise<LegendExhibit | null> {
  const fallback = fallbackLegend(slug);
  if (!databaseConfigured() || !(await ensureDatabaseReady())) return fallback;
  try {
    const sql = db();
    const rows = await sql<Array<{ id: string; slug: string; display_name: string; entity_type: string; metadata: Record<string, unknown> }>>`
      select id, slug, display_name, entity_type, metadata
      from entities
      where slug = ${slug} and metadata ->> 'collection' = 'Pro Football Hall of Fame'
      limit 1
    `;
    const row = rows[0];
    if (!row) return fallback;
    const relatedRows = await sql<Array<{ slug: string; display_name: string; entity_type: string; relation_type: string; metadata: Record<string, unknown> }>>`
      select e.slug, e.display_name, e.entity_type, r.relation_type, e.metadata
      from relations r
      join entities e on e.id = r.from_entity_id
      where r.to_entity_id = ${row.id}
        and r.relation_type <> 'season_person'
      order by e.start_date nulls last, e.display_name, r.relation_type
    `;
    const related = new Map<string, RelatedExhibit>();
    for (const item of relatedRows) {
      const key = `${item.entity_type}:${item.slug}`;
      const candidate = {
        slug: item.slug,
        name: item.display_name,
        type: item.entity_type,
        relation: labelFor(item.relation_type),
        href: hrefFor(item.entity_type, item.slug, item.metadata ?? {})
      };
      const existing = related.get(key);
      if (!existing || item.relation_type.startsWith("profile_")) related.set(key, candidate);
    }
    const rawRoles = Array.isArray(row.metadata.raidersRoles) ? row.metadata.raidersRoles : [];
    return {
      slug: row.slug,
      name: row.display_name,
      role: String(row.metadata.role ?? row.entity_type),
      collection: String(row.metadata.collection ?? "Pro Football Hall of Fame"),
      sourceLabel: String(row.metadata.sourceLabel ?? "Pro Football Hall of Fame"),
      sourceUrl: String(row.metadata.sourceUrl ?? "https://www.profootballhof.com/teams/las-vegas-raiders/team-greats"),
      position: row.metadata.position ? String(row.metadata.position) : undefined,
      years: row.metadata.years ? String(row.metadata.years) : undefined,
      number: row.metadata.number ? String(row.metadata.number) : undefined,
      distinction: row.metadata.distinction ? String(row.metadata.distinction) : undefined,
      summary: row.metadata.summary ? String(row.metadata.summary) : fallback?.summary,
      raidersRoles: rawRoles as RaidersRole[],
      related: [...related.values()],
      database: true
    };
  } catch {
    return fallback;
  }
}

export async function getChampionshipExhibit(slug: string): Promise<ChampionshipExhibit | null> {
  const fallback = fallbackChampionship(slug);
  if (!databaseConfigured() || !(await ensureDatabaseReady())) return fallback;
  try {
    const sql = db();
    const rows = await sql<Array<{ id: string; slug: string; display_name: string; start_date: string; metadata: Record<string, unknown> }>>`
      select id, slug, display_name, start_date, metadata
      from entities
      where slug = ${slug} and entity_type = 'championship'
      limit 1
    `;
    const row = rows[0];
    if (!row) return fallback;
    const relatedRows = await sql<Array<{ slug: string; display_name: string; entity_type: string; relation_type: string; metadata: Record<string, unknown> }>>`
      select e.slug, e.display_name, e.entity_type, e.metadata, r.relation_type
      from relations r
      join entities e on e.id = r.to_entity_id
      where r.from_entity_id = ${row.id}
      order by r.relation_type, e.display_name
    `;
    return {
      slug: row.slug,
      name: row.display_name,
      season: Number(row.metadata.season),
      date: String(row.start_date),
      teamName: String(row.metadata.teamName ?? "Raiders"),
      opponent: String(row.metadata.opponent ?? ""),
      score: String(row.metadata.score ?? ""),
      mvp: row.metadata.mvp ? String(row.metadata.mvp) : undefined,
      summary: String(row.metadata.summary ?? ""),
      sourceLabel: String(row.metadata.sourceLabel ?? "Source"),
      sourceUrl: String(row.metadata.sourceUrl ?? ""),
      related: relatedRows.map(item => ({
        slug: item.slug,
        name: item.display_name,
        type: item.entity_type,
        relation: labelFor(item.relation_type),
        href: hrefFor(item.entity_type, item.slug, item.metadata ?? {})
      })),
      database: true
    };
  } catch {
    return fallback;
  }
}
