import type { Metadata } from "next";
import Link from "next/link";
import { SectionTitle } from "@/components/SectionTitle";
import { getGamesArchive } from "@/lib/game-db";

export const metadata: Metadata = { title: "Games" };
export const revalidate = 300;

export default async function GamesPage() {
  const { rows, database } = await getGamesArchive();
  const wins = rows.filter(row => row.result === "W").length;
  const losses = rows.filter(row => row.result === "L").length;

  return (
    <section className="section shell page-top">
      <SectionTitle eyebrow="Postseason ledger" title="Games">
        Every Raiders postseason game currently in the franchise playoff record, from the 1967 AFL Championship through the 2021 season Wild Card game.
      </SectionTitle>
      <div className="stats-grid standalone-stats game-ledger-stats">
        <div><strong>{rows.length}</strong><span>playoff games</span></div>
        <div><strong>{wins}</strong><span>wins</span></div>
        <div><strong>{losses}</strong><span>losses</span></div>
        <div><strong>{database ? "DB" : "FILE"}</strong><span>archive source</span></div>
      </div>
      <div className="game-list">
        {[...rows].reverse().map(game => (
          <Link className="game-row" href={`/games/${game.slug}`} key={game.slug}>
            <div><span>{game.season}</span><strong>{game.round}</strong></div>
            <div><small>{game.date} · {game.site}{game.overtime ? " · OT" : ""}</small><h3>Raiders vs. {game.opponent}</h3></div>
            <div className={`game-score ${game.result === "W" ? "win" : "loss"}`}><span>{game.result}</span><strong>{game.raidersScore}–{game.opponentScore}</strong></div>
          </Link>
        ))}
      </div>
      <p className="fine-print">Primary ledger: Pro Football Reference playoff history. Open a game to see its connected season and championship records.</p>
    </section>
  );
}
