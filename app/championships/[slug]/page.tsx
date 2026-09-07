import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import championships from "@/data/championships.json";
import { getChampionshipExhibit } from "@/lib/exhibit-db";
import { SuperBowlXIExhibit } from "@/components/SuperBowlXIExhibit";

export const revalidate = 300;

export function generateStaticParams() {
  return championships.map(item => ({ slug: item.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const exhibit = await getChampionshipExhibit(slug);
  return { title: exhibit?.name ?? "Championship" };
}

export default async function ChampionshipExhibitPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const exhibit = await getChampionshipExhibit(slug);
  if (!exhibit) notFound();

  if (slug === "super-bowl-xi") {
    return (
      <section className="section shell page-top exhibit-page">
        <Link className="exhibit-back" href="/championships">← Championship Room</Link>
        <SuperBowlXIExhibit exhibit={exhibit} />
      </section>
    );
  }

  return (
    <section className="section shell page-top exhibit-page">
      <Link className="exhibit-back" href="/championships">← Championship Room</Link>
      <div className="exhibit-hero championship-exhibit-hero">
        <div>
          <span className="eyebrow">Season {exhibit.season} · Championship</span>
          <h1>{exhibit.name}</h1>
          <p>{exhibit.summary}</p>
        </div>
        <div className="exhibit-plaque score-plaque">
          <span>FINAL</span>
          <strong>{exhibit.score}</strong>
          <small>{exhibit.teamName} vs. {exhibit.opponent}</small>
          {exhibit.mvp ? <small>MVP · {exhibit.mvp}</small> : null}
          <a href={exhibit.sourceUrl} target="_blank" rel="noopener noreferrer">Primary source: {exhibit.sourceLabel} ↗</a>
        </div>
      </div>

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
      <p className="fine-print">Storage: {exhibit.database ? "connected Postgres record" : "versioned fallback record"}.</p>
    </section>
  );
}
