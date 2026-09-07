import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import games from "@/data/games.json";
import classicGames from "@/data/classic-games.json";
import rivalryGames from "@/data/battle-of-the-bay-games.json";
import { getGameExhibit } from "@/lib/game-db";

export const revalidate = 300;

export function generateStaticParams() {
  return [...games, ...classicGames, ...rivalryGames].map(game => ({ slug: game.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const game = await getGameExhibit(slug);
  return { title: game ? (game.nickname ?? `${game.round}: Raiders vs. ${game.opponent}`) : "Game" };
}

export default async function GamePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const game = await getGameExhibit(slug);
  if (!game) notFound();
  const classic = game.gameType === "regular-season-classic";
  const rivalrySeries = game.gameType === "rivalry-series";
  const regularSeason = classic || rivalrySeries;

  return (
    <section className="section shell page-top exhibit-page">
      <Link className="exhibit-back" href="/games">← Games archive</Link>
      <div className="exhibit-hero championship-exhibit-hero">
        <div>
          <span className="eyebrow">{game.season} {regularSeason ? "regular season" : "postseason"} · {game.round}</span>
          <h1>{game.nickname ? game.nickname : <>Raiders<br />vs. {game.opponent}</>}</h1>
          <p>{rivalrySeries ? "Battle of the Bay · " : classic && game.nickname ? `Raiders vs. ${game.opponent} · ` : ""}{game.result === "W" ? "Raiders victory" : "Raiders loss"} · {game.date} · {game.site}{game.overtime ? " · overtime" : ""}.</p>
        </div>
        <div className="exhibit-plaque score-plaque">
          <span>FINAL</span>
          <strong>{game.raidersScore}–{game.opponentScore}</strong>
          <small>{game.result === "W" ? "WIN" : "LOSS"} · {game.round}</small>
          <a href={game.sourceUrl} target="_blank" rel="noopener noreferrer">Primary source: {game.sourceLabel} ↗</a>
        </div>
      </div>

      {game.related.length ? (
        <div className="exhibit-related">
          <span className="eyebrow">Connected records</span>
          <div className="related-grid">
            {game.related.map(item => (
              <Link className="related-card" href={item.href} key={`${item.relation}:${item.slug}`}>
                <small>{item.relation}</small>
                <strong>{item.name}</strong>
                <b>Open record →</b>
              </Link>
            ))}
          </div>
        </div>
      ) : null}
      <p className="fine-print">Storage: {game.database ? "connected Postgres record" : "versioned fallback record"}.</p>
    </section>
  );
}
