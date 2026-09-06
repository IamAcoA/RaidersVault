import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { moments } from "@/data/moments";
import { getMomentExhibit } from "@/lib/moment-db";

export const revalidate = 300;

export function generateStaticParams() {
  return moments.map(moment => ({ slug: moment.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const moment = await getMomentExhibit(slug);
  return { title: moment ? moment.title : "Moment" };
}

export default async function MomentPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const moment = await getMomentExhibit(slug);
  if (!moment) notFound();

  return (
    <section className="section shell page-top exhibit-page">
      <Link className="exhibit-back" href="/moments">← Moments collection</Link>
      <div className="exhibit-hero">
        <div>
          <span className="eyebrow">{moment.date}{moment.opponent ? ` · vs. ${moment.opponent}` : ""}</span>
          <h1>{moment.title}</h1>
          <p>{moment.summary}</p>
          {moment.playDetail ? <p>{moment.playDetail}</p> : null}
        </div>
        <div className="exhibit-plaque">
          <span>ARCHIVE MOMENT</span>
          <strong>{moment.people.length ? moment.people.join(" · ") : "Connected franchise history"}</strong>
          <small>{moment.tags.join(" · ")}</small>
          <a href={moment.sourceUrl} target="_blank" rel="noopener noreferrer">Primary source: {moment.sourceLabel} ↗</a>
        </div>
      </div>

      {moment.related.length ? (
        <div className="exhibit-related">
          <span className="eyebrow">Connected records</span>
          <div className="related-grid">
            {moment.related.map(item => (
              <Link className="related-card" href={item.href} key={`${item.relation}:${item.slug}`}>
                <small>{item.relation}</small>
                <strong>{item.name}</strong>
                <b>Open record →</b>
              </Link>
            ))}
          </div>
        </div>
      ) : null}
      <p className="fine-print">Storage: {moment.database ? "connected Postgres record with source provenance" : "versioned fallback record"}.</p>
    </section>
  );
}
