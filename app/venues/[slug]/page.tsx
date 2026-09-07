import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getVenueExhibit, venueSlugs } from "@/lib/venues-db";

export const revalidate = 300;

export function generateStaticParams() {
  return venueSlugs().map(slug => ({ slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const venue = await getVenueExhibit(slug);
  return { title: venue?.name ?? "Venue" };
}

const rangeLabel = (range: { start: number; end: number; partial?: boolean; ongoing?: boolean }) =>
  `${range.start}${range.start === range.end ? "" : `–${range.end}`}${range.partial ? " · partial season" : ""}${range.ongoing ? " · current" : ""}`;

export default async function VenuePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const venue = await getVenueExhibit(slug);
  if (!venue) notFound();

  return (
    <section className="section shell page-top exhibit-page">
      <Link className="exhibit-back" href="/venues">← Venues archive</Link>
      <div className="exhibit-hero">
        <div>
          <span className="eyebrow">Raiders home venue · {venue.city}</span>
          <h1>{venue.name}</h1>
          <p>{venue.summary}</p>
        </div>
        <div className="exhibit-plaque">
          <span>HOME HISTORY</span>
          <strong>{venue.homeRanges.map(range => rangeLabel(range)).join(" / ")}</strong>
          <small>{venue.seasonYears.length} season records connected</small>
          <a href={venue.sourceUrl} target="_blank" rel="noopener noreferrer">Primary source: {venue.sourceLabel} ↗</a>
        </div>
      </div>

      <div className="stats-grid standalone-stats">
        <div><strong>{venue.homeRanges.length}</strong><span>home stints</span></div>
        <div><strong>{venue.seasonYears.length}</strong><span>connected seasons</span></div>
        <div><strong>{venue.indexedGames.length}</strong><span>indexed home games</span></div>
        <div><strong>{venue.eras.length}</strong><span>franchise eras</span></div>
      </div>

      <div className="exhibit-related">
        <span className="eyebrow">Home stints</span>
        <div className="related-grid">
          {venue.homeRanges.map((range, index) => (
            <Link className="related-card" href={`/seasons/${range.start}`} key={`${range.start}:${range.end}:${index}`}>
              <small>{rangeLabel(range)}</small>
              <strong>{range.note ?? `${venue.name} home era`}</strong>
              <b>Open first season →</b>
            </Link>
          ))}
        </div>
      </div>

      {venue.eras.length ? (
        <div className="exhibit-related">
          <span className="eyebrow">Connected franchise eras</span>
          <div className="related-grid">
            {venue.eras.map(era => (
              <Link className="related-card" href={`/eras/${era.slug}`} key={era.slug}>
                <small>{era.startYear}–{era.endYear}</small>
                <strong>{era.name}</strong>
                <b>Open era →</b>
              </Link>
            ))}
          </div>
        </div>
      ) : null}

      <div className="exhibit-related">
        <span className="eyebrow">Indexed home games at this venue</span>
        {venue.indexedGames.length ? (
          <div className="game-list">
            {venue.indexedGames.map(game => (
              <Link className="game-row" href={`/games/${game.slug}`} key={game.slug}>
                <div><span>{game.season}</span><strong>{game.result}</strong></div>
                <div><small>{game.date}</small><h3>{game.name}</h3></div>
                <div className={`game-score ${game.result === "W" ? "win" : "loss"}`}><span>{game.result}</span><strong>{game.score}</strong></div>
              </Link>
            ))}
          </div>
        ) : <p className="fine-print">No individually indexed RaidersVault games are attached to this venue yet.</p>}
      </div>

      <p className="fine-print">The game list reflects only games currently indexed in RaidersVault, not every game ever played at the venue. Storage: {venue.database ? "connected Postgres venue graph" : "versioned fallback venue record"}.</p>
    </section>
  );
}
