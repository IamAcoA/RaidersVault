import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getPlayerExhibit, sourceBackedPlayerSlugs } from "@/lib/player-exhibit-db";

export const revalidate = 300;

export function generateStaticParams() {
  return sourceBackedPlayerSlugs.map(slug => ({ slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const exhibit = await getPlayerExhibit(slug);
  return { title: exhibit?.name ?? "Player" };
}

export default async function PlayerExhibitPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const exhibit = await getPlayerExhibit(slug);
  if (!exhibit) notFound();

  return (
    <section className="section shell page-top exhibit-page">
      <Link className="exhibit-back" href="/players">← Players archive</Link>
      <div className="exhibit-hero">
        <div>
          <span className="eyebrow">{exhibit.position} · Raiders player</span>
          <h1>{exhibit.name}</h1>
          <p>{exhibit.distinction}</p>
        </div>
        <div className="exhibit-plaque score-plaque">
          <span>RAIDERS RECORD</span>
          <strong>{exhibit.number ? `#${exhibit.number}` : exhibit.position}</strong>
          <small>{exhibit.position} · {exhibit.years}</small>
          {exhibit.sourceUrl ? <a href={exhibit.sourceUrl} target="_blank" rel="noopener noreferrer">Primary source: {exhibit.sourceLabel} ↗</a> : null}
        </div>
      </div>

      {exhibit.related.length ? (
        <div className="exhibit-related">
          <span className="eyebrow">Connected records</span>
          <div className="related-grid">
            {exhibit.related.map(item => (
              <Link className="related-card" href={item.href} key={`${item.relation}:${item.slug}`}>
                <small>{item.relation}</small>
                <strong>{item.name}</strong>
                <b>Open record →</b>
              </Link>
            ))}
          </div>
        </div>
      ) : null}
      <p className="fine-print">Storage: {exhibit.database ? "connected Postgres record" : "versioned fallback record"}.</p>
    </section>
  );
}
