import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { eraSlugs, getEraExhibit } from "@/lib/eras-db";

export const revalidate = 300;

export function generateStaticParams() {
  return eraSlugs().map(slug => ({ slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const era = await getEraExhibit(slug);
  return { title: era ? `${era.name} Raiders Era` : "Era" };
}

export default async function EraPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const era = await getEraExhibit(slug);
  if (!era) notFound();

  return (
    <section className="section shell page-top exhibit-page">
      <Link className="exhibit-back" href="/eras">← Eras archive</Link>
      <div className="exhibit-hero">
        <div>
          <span className="eyebrow">Raiders franchise era · {era.location}</span>
          <h1>{era.name}</h1>
          <p>{era.summary}</p>
        </div>
        <div className="exhibit-plaque">
          <span>ERA</span>
          <strong>{era.startYear}–{era.endYear}{era.ongoing ? "+" : ""}</strong>
          <small>{era.seasonYears.length} connected seasons · {era.venues.length} home venues</small>
          <a href={era.sourceUrl} target="_blank" rel="noopener noreferrer">Primary source: {era.sourceLabel} ↗</a>
        </div>
      </div>

      <div className="stats-grid standalone-stats">
        <div><strong>{era.seasonYears.length}</strong><span>seasons</span></div>
        <div><strong>{era.venues.length}</strong><span>home venues</span></div>
        <div><strong>{era.indexedGames}</strong><span>indexed Vault games</span></div>
        <div><strong>{era.startYear}</strong><span>first season</span></div>
      </div>

      <div className="exhibit-related">
        <span className="eyebrow">Home venues</span>
        <div className="related-grid">
          {era.venues.map(venue => (
            <Link className="related-card" href={`/venues/${venue.slug}`} key={venue.slug}>
              <small>{venue.city}</small>
              <strong>{venue.name}</strong>
              <b>Open venue →</b>
            </Link>
          ))}
        </div>
      </div>

      <div className="exhibit-related">
        <span className="eyebrow">Seasons in this era</span>
        <div className="related-grid">
          {era.seasonYears.map(year => (
            <Link className="related-card" href={`/seasons/${year}`} key={year}>
              <small>{era.location} Raiders</small>
              <strong>{year}</strong>
              <b>Open season →</b>
            </Link>
          ))}
        </div>
      </div>

      <p className="fine-print">Indexed game count reflects RaidersVault's current game archive, not every game played during the era. Storage: {era.database ? "connected Postgres era graph" : "versioned fallback era record"}.</p>
    </section>
  );
}
