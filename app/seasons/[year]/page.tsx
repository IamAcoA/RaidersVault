import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getSeasonExhibit, seasonYears } from "@/lib/season-db";

export const revalidate = 300;

export function generateStaticParams() {
  return seasonYears().map(year => ({ year: String(year) }));
}

export async function generateMetadata({ params }: { params: Promise<{ year: string }> }): Promise<Metadata> {
  const { year } = await params;
  const season = await getSeasonExhibit(Number(year));
  return { title: season ? `${season.year} ${season.location} Raiders` : "Season" };
}

export default async function SeasonPage({ params }: { params: Promise<{ year: string }> }) {
  const { year: rawYear } = await params;
  const season = await getSeasonExhibit(Number(rawYear));
  if (!season) notFound();

  return (
    <section className="section shell page-top exhibit-page">
      <Link className="exhibit-back" href="/seasons">← Season archive</Link>
      <div className="exhibit-hero">
        <div>
          <span className="eyebrow">{season.location} Raiders · season exhibit</span>
          <h1>{season.year}</h1>
          <p>{season.note}</p>
        </div>
        <div className="exhibit-plaque">
          <span>{season.status === "verified-detail" ? "VERIFIED SEASON DETAIL" : "CHRONOLOGY INDEX"}</span>
          <strong>{season.record || `${season.location} Raiders season`}</strong>
          {season.coach ? <small>Head coach · {season.coach}</small> : null}
          {season.finish ? <small>Finish · {season.finish}</small> : null}
          <a href={season.sourceUrl} target="_blank" rel="noopener noreferrer">Franchise chronology: {season.sourceLabel} ↗</a>
        </div>
      </div>

      {season.status === "indexed" ? (
        <p className="fine-print">This season is indexed in the franchise chronology, but detailed record/coach/finish fields are intentionally withheld until they are separately verified.</p>
      ) : null}

      {season.related.length ? (
        <div className="exhibit-related">
          <span className="eyebrow">Connected records</span>
          <div className="related-grid">
            {season.related.map(item => (
              <Link className="related-card" href={item.href} key={`${item.type}:${item.slug}`}>
                <small>{item.relation}</small>
                <strong>{item.name}</strong>
                <b>Open record →</b>
              </Link>
            ))}
          </div>
        </div>
      ) : (
        <div className="exhibit-related">
          <span className="eyebrow">Connected records</span>
          <p className="fine-print">No individually indexed games or championship records are connected to this season yet.</p>
        </div>
      )}
      <p className="fine-print">Storage: {season.database ? "connected Postgres season record" : "versioned fallback chronology"}.</p>
    </section>
  );
}
