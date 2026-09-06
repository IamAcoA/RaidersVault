import championships from "@/data/championships.json";
import legends from "@/data/legends.json";
import { moments } from "@/data/moments";
import { players } from "@/data/players";
import { seasons } from "@/data/seasons";
import { timeline } from "@/data/timeline";
import type { VaultSearchDocument } from "@/lib/types";

const playerSlugs = new Set(players.map(player => player.slug));

export const vaultIndex: VaultSearchDocument[] = [
  ...players.map(player => ({
    id: `player:${player.slug}`,
    type: "player" as const,
    title: player.name,
    subtitle: `${player.position} · ${player.years}${player.number ? ` · #${player.number}` : ""}`,
    text: `${player.name} ${player.position} ${player.years} ${player.number ?? ""} ${player.distinction}`,
    href: player.sourceUrl ? `/players/${player.slug}` : legends.some(legend => legend.slug === player.slug) ? `/legends/${player.slug}` : "/players"
  })),
  ...legends.filter(legend => !playerSlugs.has(legend.slug)).map(legend => ({
    id: `legend:${legend.slug}`,
    type: "legend" as const,
    title: legend.name,
    subtitle: `${legend.role} · ${legend.collection}`,
    text: `${legend.name} ${legend.role} ${legend.collection} Raiders Hall of Fame`,
    href: `/legends/${legend.slug}`
  })),
  ...seasons.map(season => ({
    id: `season:${season.year}`,
    type: "season" as const,
    title: `${season.year} ${season.location} Raiders`,
    subtitle: `${season.record} · ${season.coach}`,
    text: `${season.year} ${season.location} Raiders ${season.record} ${season.coach} ${season.finish} ${season.note}`,
    href: "/seasons",
    year: season.year
  })),
  ...championships.map(championship => {
    const mvp = "mvp" in championship ? championship.mvp : "";
    return {
      id: `championship:${championship.slug}`,
      type: "championship" as const,
      title: championship.name,
      subtitle: `${championship.score} · vs. ${championship.opponent}`,
      text: `${championship.name} ${championship.season} ${championship.teamName} ${championship.opponent} ${championship.score} ${mvp ?? ""} ${championship.summary}`,
      href: `/championships/${championship.slug}`,
      year: championship.season
    };
  }),
  ...moments.map(moment => ({
    id: `moment:${moment.slug}`,
    type: "moment" as const,
    title: moment.title,
    subtitle: `${moment.date}${moment.opponent ? ` · vs. ${moment.opponent}` : ""}`,
    text: `${moment.title} ${moment.date} ${moment.opponent ?? ""} ${moment.summary} ${moment.tags.join(" ")}`,
    href: "/moments",
    year: Number(moment.date.slice(0, 4))
  })),
  ...timeline.map(event => ({
    id: `timeline:${event.date}:${event.title}`,
    type: "timeline" as const,
    title: event.title,
    subtitle: `${event.year} · ${event.era}`,
    text: `${event.title} ${event.summary} ${event.year} ${event.era} ${event.category}`,
    href: "/timeline",
    year: event.year
  }))
];
