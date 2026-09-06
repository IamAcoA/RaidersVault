import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getRivalryExhibit, rivalrySlugs } from "@/lib/rivalry-db";

export const revalidate = 300;

export function generateStaticParams() {
  return rivalrySlugs().map(slug => ({ slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const rivalry = await getRivalryExhibit(slug);
  return { title: rivalry ? `Raiders vs. ${rivalry.shortName}` : "Rivalry" };
}

export default async function RivalryPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const rivalry = await getRivalryExhibit(slug);
  if (!rivalry) notFound();
  const wins = rivalry.indexedGames.filter(game => game.result === "W").length;
  const losses = rivalry.indexedGames.filter(game => game.result === "L").length;

  return (
    <section className="section shell page-top exhibit-page">
      <Link className="exhibit-back" href="/rivalries">← Rivalries wing</Link>
      <div className="exhibit-hero championship-exhibit-hero">
        <div>
          <span className="eyebrow">{rivalry.kind} · since {rivalry.startYear}</span>
          <h1>Raiders<br />vs. {rivalry.shortName}</h1>
          <p>{rivalry.summary}</p>
        </div>
        <div className="exhibit-plaque">
          <span>OFFICIAL SERIES RECORD</span>
          <strong>{rivalry.seriesRecord}</strong>
          {rivalry.postseasonRecord ? <small>{rivalry.postseasonRecord}</small> : null}
          <small>Record marked through {rivalry.seriesThrough}</small>
          <a href={rivalry.sourceUrl} target="_blank" rel="noopener noreferrer">Primary source: {rivalry.sourceLabel} ↗</a>
          <a href={rivalry.historyUrl} target="_blank" rel="noopener noreferrer">Raiders rivalry history ↗</a>
        </div>
      </div>

      <div className="stats-grid standalone-stats game-ledger-stats">
        <div><strong>{rivalry.indexedGames.length}</strong><span>indexed Vault games</span></div>
        <div><strong>{wins}</strong><span>indexed wins</span></div>
        <div><strong>{losses}</strong><span>indexed losses</span></div>
        <div><strong>{rivalry.relatedMoments.length}</strong><span>connected Moments</span></div>
      </div>

      {rivalry.relatedMoments.length ? (
        <div className="exhibit-related">
          <span className="eyebrow">Defining Moments in the Vault</span>
          <div className="related-grid">
            {rivalry.relatedMoments.map(moment => (
              <Link className="related-card" href={`/moments/${moment.slug}`} key={moment.slug}>
                <small>{moment.date}</small>
                <strong>{moment.title}</strong>
                <b>Open Moment →</b>
              </Link>
            ))}
          </div>
        </div>
      ) : null}

      <div className="exhibit-related">
        <span className="eyebrow">Games currently indexed in RaidersVault</span>
        {rivalry.indexedGames.length ? (
          <div className="game-list">
            {rivalry.indexedGames.map(game => (
              <Link className="game-row" href={`/games/${game.slug}`} key={game.slug}>
                <div><span>{game.season}</span><strong>{game.nickname ?? game.round}</strong></div>
                <div><small>{game.date} · {game.site}</small><h3>Raiders vs. {game.opponent}</h3></div>
                <div className={`game-score ${game.result === "W" ? "win" : "loss"}`}><span>{game.result}</span><strong>{game.raidersScore}–{game.opponentScore}</strong></div>
              </Link>
            ))}
          </div>
        ) : <p className="fine-print">No individual game records for this rivalry are indexed yet.</p>}
      </div>
      <p className="fine-print">The all-time series record is not calculated from the limited game list above. Storage: {rivalry.database ? "connected Postgres rivalry record" : "versioned fallback rivalry record"}.</p>
    </section>
  );
}
