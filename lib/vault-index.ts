import championships from "@/data/championships.json";
import games from "@/data/games.json";
import classicGames from "@/data/classic-games.json";
import battleGames from "@/data/battle-of-the-bay-games.json";
import eras from "@/data/eras.json";
import legends from "@/data/legends.json";
import alDavisCollection from "@/data/al-davis-collection.json";
import { moments } from "@/data/moments";
import numbers from "@/data/numbers.json";
import { players } from "@/data/players";
import rivalries from "@/data/rivalries.json";
import { seasons } from "@/data/seasons";
import { timeline } from "@/data/timeline";
import venues from "@/data/venues.json";
import type { VaultSearchDocument } from "@/lib/types";

const playerSlugs = new Set(players.map(player => player.slug));
const slugify = (value: string) => value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

export const vaultIndex: VaultSearchDocument[] = [
  ...players.map(player => ({ id: `player:${player.slug}`, type: "player" as const, title: player.name, subtitle: `${player.position} · ${player.years}${player.number ? ` · #${player.number}` : ""}`, text: `${player.name} ${player.position} ${player.years} number ${player.number ?? ""} ${player.distinction}`, href: player.sourceUrl ? `/players/${player.slug}` : legends.some(legend => legend.slug === player.slug) ? `/legends/${player.slug}` : "/players" })),
  ...legends.filter(legend => !playerSlugs.has(legend.slug)).map(legend => ({ id: `legend:${legend.slug}`, type: "legend" as const, title: legend.name, subtitle: `${legend.role} · ${legend.collection}`, text: `${legend.name} ${legend.role} ${legend.collection} Raiders Hall of Fame`, href: `/legends/${legend.slug}` })),
  ...eras.map(era => ({ id: `era:${era.slug}`, type: "era" as const, title: `${era.name} Raiders Era`, subtitle: `${era.startYear}–${era.endYear}${"ongoing" in era && era.ongoing ? "+" : ""} · ${era.location}`, text: `${era.name} ${era.location} Raiders era ${era.startYear} ${era.endYear} ${era.summary} ${era.venueSlugs.join(" ")}`, href: `/eras/${era.slug}`, year: era.startYear })),
  ...seasons.map(season => ({ id: `season:${season.year}`, type: "season" as const, title: `${season.year} ${season.location} Raiders`, subtitle: `${season.record} · ${season.coach}`, text: `${season.year} ${season.location} Raiders ${season.record} ${season.coach} ${season.finish} ${season.note}`, href: `/seasons/${season.year}`, year: season.year })),
  ...venues.map(venue => ({ id: `venue:${venue.slug}`, type: "venue" as const, title: venue.name, subtitle: venue.city, text: `${venue.name} ${venue.city} Raiders stadium venue home field Coliseum ${venue.summary} ${venue.homeRanges.map(range => `${range.start} ${range.end}`).join(" ")}`, href: `/venues/${venue.slug}`, year: venue.homeRanges[0]?.start })),
  ...games.map(game => ({ id: `game:${game.slug}`, type: "game" as const, title: `Raiders vs. ${game.opponent}`, subtitle: `${game.season} · ${game.round} · ${game.result} ${game.raidersScore}-${game.opponentScore}${game.overtime ? " OT" : ""}`, text: `${game.season} ${game.date} ${game.round} Raiders ${game.opponent} ${game.result} ${game.raidersScore} ${game.opponentScore} ${game.site} ${game.overtime ? "overtime" : ""}`, href: `/games/${game.slug}`, year: game.season })),
  ...classicGames.map(game => ({ id: `game:${game.slug}`, type: "game" as const, title: game.nickname, subtitle: `${game.season} · ${game.round} · Raiders ${game.raidersScore}-${game.opponentScore} ${game.opponent}`, text: `${game.nickname} ${game.season} ${game.date} ${game.round} Raiders ${game.opponent} ${game.result} ${game.raidersScore} ${game.opponentScore} ${game.site} regular season classic`, href: `/games/${game.slug}`, year: game.season })),
  ...battleGames.map(game => ({ id: `game:${game.slug}`, type: "game" as const, title: game.nickname ?? `Raiders vs. San Francisco 49ers`, subtitle: `${game.season} · Battle of the Bay · ${game.result} ${game.raidersScore}-${game.opponentScore}${game.overtime ? " OT" : ""}`, text: `Battle of the Bay Raiders 49ers San Francisco rivalry ${game.season} ${game.date} ${game.result} ${game.raidersScore} ${game.opponentScore} ${game.site} ${game.overtime ? "overtime" : ""}`, href: `/games/${game.slug}`, year: game.season })),
  ...championships.map(championship => { const mvp = "mvp" in championship ? championship.mvp : ""; return { id: `championship:${championship.slug}`, type: "championship" as const, title: championship.name, subtitle: `${championship.score} · vs. ${championship.opponent}`, text: `${championship.name} ${championship.season} ${championship.teamName} ${championship.opponent} ${championship.score} ${mvp ?? ""} ${championship.summary}`, href: `/championships/${championship.slug}`, year: championship.season }; }),
  ...rivalries.map(rivalry => ({ id: `rivalry:${rivalry.slug}`, type: "rivalry" as const, title: `Raiders vs. ${rivalry.shortName}`, subtitle: rivalry.seriesRecord, text: `${rivalry.name} ${rivalry.shortName} Raiders rivalry ${rivalry.kind} ${rivalry.seriesRecord} ${"postseasonRecord" in rivalry ? rivalry.postseasonRecord ?? "" : ""} ${rivalry.summary} ${rivalry.aliases.join(" ")}`, href: `/rivalries/${rivalry.slug}`, year: rivalry.startYear })),
  ...numbers.map(record => ({
    id: `number:${record.number}`,
    type: "number" as const,
    title: `Raiders #${record.number}`,
    subtitle: `${record.wearerCount} documented wearers`,
    text: `Raiders number ${record.number} who wore ${record.number} uniform jersey ${record.wearers.map(wearer => `${wearer.name} ${wearer.from} ${wearer.to}`).join(" ")}`,
    href: `/numbers/${record.number}`
  })),
  {
    id: "collection:al-davis",
    type: "collection",
    title: alDavisCollection.title,
    subtitle: alDavisCollection.subtitle,
    text: `Al Davis Collection Raiders ${alDavisCollection.lifespan} ${alDavisCollection.summary}`,
    href: "/al-davis",
    year: 1963
  },
  ...alDavisCollection.milestones.map(milestone => {
    const slug = `al-davis-${milestone.year}-${slugify(milestone.title)}`;
    return {
      id: `collection:${slug}`,
      type: "collection" as const,
      title: milestone.title,
      subtitle: `${milestone.date} · Al Davis Collection`,
      text: `Al Davis ${milestone.year} ${milestone.title} ${milestone.summary} ${milestone.links.map(link => link.label).join(" ")}`,
      href: `/al-davis#${slug}`,
      year: milestone.year
    };
  }),
  ...moments.map(moment => ({ id: `moment:${moment.slug}`, type: "moment" as const, title: moment.title, subtitle: `${moment.date}${moment.opponent ? ` · vs. ${moment.opponent}` : ""}`, text: `${moment.title} ${moment.date} ${moment.opponent ?? ""} ${moment.summary} ${moment.playDetail ?? ""} ${(moment.people ?? []).join(" ")} ${moment.tags.join(" ")}`, href: `/moments/${moment.slug}`, year: Number(moment.date.slice(0, 4)) })),
  ...timeline.map(event => ({ id: `timeline:${event.date}:${event.title}`, type: "timeline" as const, title: event.title, subtitle: `${event.year} · ${event.era}`, text: `${event.title} ${event.summary} ${event.year} ${event.era} ${event.category}`, href: "/timeline", year: event.year }))
];
