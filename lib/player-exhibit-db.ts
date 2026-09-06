import championships from "@/data/championships.json";
import classicGames from "@/data/classic-games.json";
import games from "@/data/games.json";
import moments from "@/data/moments.json";
import peopleProfiles from "@/data/people-profiles.json";
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

interface RaidersRole {
  label: string;
  start: number;
  end: number;
}

interface PeopleProfile {
  slug: string;
  summary: string;
  sourceLabel: string;
  sourceUrl: string;
  raidersRoles: RaidersRole[];
  connections: Array<{ type: string; slug: string; relation: string }>;
}

export interface PlayerExhibit extends SourceBackedPlayer {
  summary?: string;
  raidersRoles: RaidersRole[];
  related: Array<{ slug: string; name: string; relation: string; href: string; type: string }>;
  database: boolean;
}

const players = rawPlayers as SourceBackedPlayer[];
const profiles = peopleProfiles as PeopleProfile[];

function profileFor(slug: string) {
  return profiles.find(item => item.slug === slug);
}

function hrefFor(type: string, slug: string) {
  if (type === "championship") return `/championships/${slug}`;
  if (type === "game") return `/games/${slug}`;
  if (type === "moment") return `/moments/${slug}`;
  if (type === "season") return `/seasons/${slug.replace(/^season-/, "")}`;
  return "/vault";
}

function labelFor(relation: string) {
  if (relation === "championship_mvp") return "Championship MVP";
  if (relation === "moment_person") return "Archive moment";
  if (relation.startsWith("profile_")) {
    return relation.replace(/^profile_/, "").split("_").filter(Boolean).map((part, index) => index === 0 ? part.charAt(0).toUpperCase() + part.slice(1) : part).join(" ");
  }
  return relation;
}

function fallbackRelated(profile?: PeopleProfile) {
  if (!profile) return [];
  return profile.connections.flatMap(item => {
    if (item.type === "championship") {
      const record = championships.find(entry => entry.slug === item.slug);
      return record ? [{ slug: record.slug, name: record.name, relation: item.relation, href: `/championships/${record.slug}`, type: "championship" }] : [];
    }
    if (item.type === "game") {
      const record = [...games, ...classicGames].find(entry => entry.slug === item.slug);
      if (!record) return [];
      const nickname = "nickname" in record ? String(record.nickname ?? "") : "";
      return [{ slug: record.slug, name: nickname || `Raiders vs. ${record.opponent}`, relation: item.relation, href: `/games/${record.slug}`, type: "game" }];
    }
    if (item.type === "moment") {
      const record = moments.find(entry => entry.slug === item.slug);
      return record ? [{ slug: record.slug, name: record.title, relation: item.relation, href: `/moments/${record.slug}`, type: "moment" }] : [];
    }
    return [];
  });
}

function fallback(slug: string): PlayerExhibit | null {
  const player = players.find(item => item.slug === slug && item.sourceUrl);
  if (!player) return null;
  const profile = profileFor(slug);
  return {
    ...player,
    sourceLabel: profile?.sourceLabel ?? player.sourceLabel,
    sourceUrl: profile?.sourceUrl ?? player.sourceUrl,
    summary: profile?.summary,
    raidersRoles: profile?.raidersRoles ?? [],
    related: fallbackRelated(profile),
    database: false
  };
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
    const relatedRows = await sql<Array<{ slug: string; display_name: string; entity_type: string; relation_type: string }>>`
      select e.slug, e.display_name, e.entity_type, r.relation_type
      from relations r
      join entities e on e.id = r.from_entity_id
      where r.to_entity_id = ${row.id}
        and r.relation_type <> 'season_person'
      order by e.start_date nulls last, e.display_name, r.relation_type
    `;
    const related = new Map<string, { slug: string; name: string; relation: string; href: string; type: string }>();
    for (const item of relatedRows) {
      const key = `${item.entity_type}:${item.slug}`;
      const candidate = {
        slug: item.slug,
        name: item.display_name,
        relation: labelFor(item.relation_type),
        href: hrefFor(item.entity_type, item.slug),
        type: item.entity_type
      };
      const existing = related.get(key);
      if (!existing || item.relation_type.startsWith("profile_")) related.set(key, candidate);
    }
    return {
      slug: row.slug,
      name: row.display_name,
      position: String(row.metadata.position ?? ""),
      years: String(row.metadata.years ?? ""),
      number: row.metadata.number ? String(row.metadata.number) : undefined,
      distinction: String(row.metadata.distinction ?? ""),
      summary: row.metadata.summary ? String(row.metadata.summary) : fallbackRecord?.summary,
      raidersRoles: Array.isArray(row.metadata.raidersRoles) ? row.metadata.raidersRoles as RaidersRole[] : fallbackRecord?.raidersRoles ?? [],
      sourceLabel: String(row.metadata.sourceLabel ?? "Source"),
      sourceUrl: String(row.metadata.sourceUrl),
      related: [...related.values()],
      database: true
    };
  } catch {
    return fallbackRecord;
  }
}

export const sourceBackedPlayerSlugs = players.filter(item => item.sourceUrl).map(item => item.slug);
