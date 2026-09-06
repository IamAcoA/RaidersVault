import type { Metadata } from "next";
import Link from "next/link";
import { SectionTitle } from "@/components/SectionTitle";
import { getClassicGamesArchive, getGamesArchive } from "@/lib/game-db";

export const metadata: Metadata = { title: "Games" };
export const revalidate = 300;

export default async function GamesPage() {
  const [{ rows, database }, { rows: classics, database: classicsDatabase }] = await Promise.all([
    getGamesArchive(),
    getClassicGamesArchive()
  ]);
  const wins = rows.filter(row => row.result === "W").length;
  const losses = rows.filter(row => row.result === "L").length;

  return (
    <section className="section shell page-top">
      <SectionTitle eyebrow="Game archive" title="Games">
        The complete Raiders postseason ledger, plus a growing curated collection of source-backed regular-season games that became part of franchise mythology.
      </SectionTitle>
      <div className="stats-grid standalone-stats game-ledger-stats">
        <div><strong>{rows.length}</strong><span>playoff games</span></div>
        <div><strong>{wins}</strong><span>playoff wins</span></div>
        <div><strong>{losses}</strong><span>playoff losses</span></div>
        <div><strong>{classics.length}</strong><span>classic regular-season games</span></div>
      </div>

      <div className="exhibit-related game-collection-section">
        <SectionTitle eyebrow="Curated classics" title="Classic regular-season games">
          These are selected, verified historical games—not yet a complete regular-season ledger. Each is linked to its named Moment exhibit and source record.
        </SectionTitle>
        <div className="related-grid">
          {classics.map(game => (
            <Link className="related-card" href={`/games/${game.slug}`} key={game.slug}>
              <small>{game.season} · {game.round} · {game.site}</small>
              <strong>{game.nickname ?? `Raiders vs. ${game.opponent}`}</strong>
              <span>Raiders {game.raidersScore} · {game.opponent} {game.opponentScore}</span>
              <b>Open game →</b>
            </Link>
          ))}
        </div>
      </div>

      <div className="exhibit-related game-collection-section">
        <SectionTitle eyebrow="Complete ledger" title="Postseason games">
          Every Raiders postseason game currently in the franchise playoff record, from the 1967 AFL Championship through the 2021 season Wild Card game.
        </SectionTitle>
        <div className="game-list">
          {[...rows].reverse().map(game => (
            <Link className="game-row" href={`/games/${game.slug}`} key={game.slug}>
              <div><span>{game.season}</span><strong>{game.round}</strong></div>
              <div><small>{game.date} · {game.site}{game.overtime ? " · OT" : ""}</small><h3>Raiders vs. {game.opponent}</h3></div>
              <div className={`game-score ${game.result === "W" ? "win" : "loss"}`}><span>{game.result}</span><strong>{game.raidersScore}–{game.opponentScore}</strong></div>
            </Link>
          ))}
        </div>
      </div>
      <p className="fine-print">Storage: {database && classicsDatabase ? "both collections served from Render Postgres" : "database-backed archive with versioned fallback"}. Postseason ledger source: Pro Football Reference. Classic-game sources: Raiders official history.</p>
    </section>
  );
}
