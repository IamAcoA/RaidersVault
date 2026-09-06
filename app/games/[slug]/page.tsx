import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import games from "@/data/games.json";
import { getGameExhibit } from "@/lib/game-db";

export const revalidate = 300;

export function generateStaticParams() {
  return games.map(game => ({ slug: game.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const game = await getGameExhibit(slug);
  return { title: game ? `${game.round}: Raiders vs. ${game.opponent}` : "Game" };
}

export default async function GamePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const game = await getGameExhibit(slug);
  if (!game) notFound();

  return (
    <section className="section shell page-top exhibit-page">
      <Link className="exhibit-back" href="/games">← Postseason ledger</Link>
      <div className="exhibit-hero championship-exhibit-hero">
        <div>
          <span className="eyebrow">{game.season} postseason · {game.round}</span>
          <h1>Raiders<br />vs. {game.opponent}</h1>
          <p>{game.result === "W" ? "Raiders victory" : "Raiders loss"} · {game.date} · {game.site}{game.overtime ? " · overtime" : ""}.</p>
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
