import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import legends from "@/data/legends.json";
import { getLegendExhibit } from "@/lib/exhibit-db";

export const revalidate = 300;

export function generateStaticParams() {
  return legends.map(item => ({ slug: item.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const exhibit = await getLegendExhibit(slug);
  return { title: exhibit?.name ?? "Legend" };
}

const roleLabel = (role: string) => role === "executive" ? "Executive" : role === "coach" ? "Coach" : "Player";
const roleYears = (start: number, end: number) => start === end ? String(start) : `${start}–${end}`;

export default async function LegendExhibitPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const exhibit = await getLegendExhibit(slug);
  if (!exhibit) notFound();

  const details = [exhibit.position, exhibit.years, exhibit.number ? `#${exhibit.number}` : undefined].filter(Boolean);

  return (
    <section className="section shell page-top exhibit-page">
      <Link className="exhibit-back" href="/legends">← Hall of Fame wing</Link>
      <div className="exhibit-hero">
        <div>
          <span className="eyebrow">{roleLabel(exhibit.role)} · Raiders legend</span>
          <h1>{exhibit.name}</h1>
          <p>{exhibit.summary ?? exhibit.distinction ?? `${exhibit.name} is included in the Pro Football Hall of Fame's Raiders franchise collection.`}</p>
        </div>
        <div className="exhibit-plaque">
          <span>COLLECTION</span>
          <strong>{exhibit.collection}</strong>
          {details.length ? <small>{details.join(" · ")}</small> : <small>{roleLabel(exhibit.role)}</small>}
          <a href={exhibit.sourceUrl} target="_blank" rel="noopener noreferrer">Primary source: {exhibit.sourceLabel} ↗</a>
        </div>
      </div>

      {slug === "al-davis" ? (
        <div className="exhibit-related">
          <span className="eyebrow">Special collection</span>
          <div className="related-grid">
            <Link className="related-card" href="/al-davis">
              <small>Leadership archive · 1963–2011</small>
              <strong>The Al Davis Collection</strong>
              <b>Enter collection →</b>
            </Link>
          </div>
        </div>
      ) : null}

      {exhibit.raidersRoles.length ? (
        <div className="exhibit-related">
          <span className="eyebrow">Raiders roles</span>
          <div className="related-grid">
            {exhibit.raidersRoles.map((role, index) => (
              <Link className="related-card" href={`/seasons/${role.start}`} key={`${role.label}:${role.start}:${index}`}>
                <small>{roleYears(role.start, role.end)}</small>
                <strong>{role.label}</strong>
                <b>Open first season →</b>
              </Link>
            ))}
          </div>
        </div>
      ) : null}

      {exhibit.related.length ? (
        <div className="exhibit-related">
          <span className="eyebrow">Connected records</span>
          <div className="related-grid">
            {exhibit.related.map(item => (
              <Link className="related-card" href={item.href} key={`${item.type}:${item.slug}`}>
                <small>{item.relation}</small>
                <strong>{item.name}</strong>
                <b>Open record →</b>
              </Link>
            ))}
          </div>
        </div>
      ) : (
        <p className="fine-print">Connected games, seasons and honors will appear here as the archive expands.</p>
      )}
      <p className="fine-print">Storage: {exhibit.database ? "connected Postgres record with sourced Raiders roles" : "versioned fallback record"}.</p>
    </section>
  );
}
