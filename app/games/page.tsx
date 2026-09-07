import type { Metadata } from "next";
import Link from "next/link";
import { SectionTitle } from "@/components/SectionTitle";
import { getClassicGamesArchive, getGamesArchive, getRivalrySeriesArchive } from "@/lib/game-db";

export const metadata: Metadata = { title: "Games" };
export const revalidate = 300;

export default async function GamesPage() {
  const [{ rows, database }, { rows: classics, database: classicsDatabase }, { rows: rivalrySeries, database: rivalryDatabase }] = await Promise.all([
    getGamesArchive(),
    getClassicGamesArchive(),
    getRivalrySeriesArchive()
  ]);
  const wins = rows.filter(row => row.result === "W").length;
  const losses = rows.filter(row => row.result === "L").length;

  return (
    <section className="section shell page-top" data-reveal>
      <SectionTitle eyebrow="Game archive" title="Games">
        The complete Raiders postseason ledger, the complete 15-game Battle of the Bay regular-season series, and a growing curated collection of source-backed regular-season classics. Hover a game to surface its memory before opening the full exhibit.
      </SectionTitle>
      <div className="stats-grid standalone-stats game-ledger-stats">
        <div><strong>{rows.length}</strong><span>playoff games</span></div>
        <div><strong>{wins}</strong><span>playoff wins</span></div>
        <div><strong>{rivalrySeries.length}</strong><span>Battle of the Bay games</span></div>
        <div><strong>{classics.length}</strong><span>other classic games</span></div>
      </div>

      <div className="exhibit-related game-collection-section" data-reveal>
        <SectionTitle eyebrow="Complete cross-bay series" title="Battle of the Bay">
          Every Raiders–49ers regular-season meeting from 1970 through the January 1, 2023 overtime game at Allegiant Stadium. The current series stands 8–7 San Francisco.
        </SectionTitle>
        <div className="game-list">
          {[...rivalrySeries].reverse().map(game => (
            <Link
              className="game-row"
              href={`/games/${game.slug}`}
              key={game.slug}
              data-preview-title={game.nickname ?? `Raiders vs. ${game.opponent}`}
              data-preview-meta={`${game.date} · ${game.site}${game.overtime ? " · OT" : ""} · Raiders ${game.raidersScore}–${game.opponentScore} ${game.result}`}
              data-preview-kicker="Battle of the Bay"
              data-preview-art={String(game.season).slice(2)}
            >
              <div><span>{game.season}</span><strong>{game.nickname ?? "Battle of the Bay"}</strong></div>
              <div><small>{game.date} · {game.site}{game.overtime ? " · OT" : ""}</small><h3>Raiders vs. {game.opponent}</h3></div>
              <div className={`game-score ${game.result === "W" ? "win" : "loss"}`}><span>{game.result}</span><strong>{game.raidersScore}–{game.opponentScore}</strong></div>
            </Link>
          ))}
        </div>
      </div>

      <div className="exhibit-related game-collection-section" data-reveal>
        <SectionTitle eyebrow="Curated classics" title="Classic regular-season games">
          Selected, verified historical games outside the Battle of the Bay ledger. Each is linked to its named Moment exhibit and source record.
        </SectionTitle>
        <div className="related-grid">
          {classics.map(game => (
            <Link
              className="related-card"
              href={`/games/${game.slug}`}
              key={game.slug}
              data-preview-title={game.nickname ?? `Raiders vs. ${game.opponent}`}
              data-preview-meta={`${game.date} · Raiders ${game.raidersScore}–${game.opponentScore} ${game.opponent} · ${game.site}`}
              data-preview-kicker="Classic game"
              data-preview-art={String(game.season).slice(2)}
            >
              <small>{game.season} · {game.round} · {game.site}</small>
              <strong>{game.nickname ?? `Raiders vs. ${game.opponent}`}</strong>
              <span>Raiders {game.raidersScore} · {game.opponent} {game.opponentScore}</span>
              <b>Open game →</b>
            </Link>
          ))}
        </div>
      </div>

      <div className="exhibit-related game-collection-section" data-reveal>
        <SectionTitle eyebrow="Complete ledger" title="Postseason games">
          Every Raiders postseason game currently in the franchise playoff record, from the 1967 AFL Championship through the 2021 season Wild Card game.
        </SectionTitle>
        <div className="game-list">
          {[...rows].reverse().map(game => (
            <Link
              className="game-row"
              href={`/games/${game.slug}`}
              key={game.slug}
              data-preview-title={`Raiders vs. ${game.opponent}`}
              data-preview-meta={`${game.date} · ${game.round} · ${game.site}${game.overtime ? " · OT" : ""} · ${game.result} ${game.raidersScore}–${game.opponentScore}`}
              data-preview-kicker="Postseason archive"
              data-preview-art={String(game.season).slice(2)}
            >
              <div><span>{game.season}</span><strong>{game.round}</strong></div>
              <div><small>{game.date} · {game.site}{game.overtime ? " · OT" : ""}</small><h3>Raiders vs. {game.opponent}</h3></div>
              <div className={`game-score ${game.result === "W" ? "win" : "loss"}`}><span>{game.result}</span><strong>{game.raidersScore}–{game.opponentScore}</strong></div>
            </Link>
          ))}
        </div>
      </div>
      <p className="fine-print">Storage: {database && classicsDatabase && rivalryDatabase ? "all game collections served from Render Postgres" : "database-backed archive with versioned fallback"}. Postseason source: Pro Football Reference. Battle of the Bay and classic-game sources: Raiders official history.</p>
    </section>
  );
}
