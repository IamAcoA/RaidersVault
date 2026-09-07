import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getNumberExhibit, numberSlugs, wearerHref } from "@/lib/numbers-db";

export const revalidate = 300;

export function generateStaticParams() {
  return numberSlugs().map(number => ({ number }));
}

export async function generateMetadata({ params }: { params: Promise<{ number: string }> }): Promise<Metadata> {
  const { number } = await params;
  const exhibit = await getNumberExhibit(number);
  return { title: exhibit ? `Raiders #${number}` : "Number" };
}

const years = (from: number, to: number) => from === to ? String(from) : `${from}–${to}`;

export default async function NumberPage({ params }: { params: Promise<{ number: string }> }) {
  const { number } = await params;
  const exhibit = await getNumberExhibit(number);
  if (!exhibit) notFound();
  const linkedWearers = exhibit.wearers.filter(wearer => wearer.vaultSlug).length;

  return (
    <section className="section shell page-top exhibit-page">
      <Link className="exhibit-back" href="/numbers">← Numbers archive</Link>
      <div className="exhibit-hero">
        <div>
          <span className="eyebrow">Raiders uniform history</span>
          <h1>#{exhibit.number}</h1>
          <p>{exhibit.wearerCount} Raiders appear in this team-specific uniform-number reference history.</p>
        </div>
        <div className="exhibit-plaque score-plaque">
          <span>NUMBER RECORD</span>
          <strong>#{exhibit.number}</strong>
          <small>{exhibit.wearerCount} documented wearers</small>
          <small>Source checked · {exhibit.sourceChecked}</small>
          <a href={exhibit.sourceUrl} target="_blank" rel="noopener noreferrer">Primary source: {exhibit.sourceLabel} ↗</a>
        </div>
      </div>

      <div className="stats-grid standalone-stats">
        <div><strong>{exhibit.wearerCount}</strong><span>documented wearers</span></div>
        <div><strong>{linkedWearers}</strong><span>connected Vault people</span></div>
        <div><strong>{Math.min(...exhibit.wearers.map(wearer => wearer.from))}</strong><span>earliest listed season</span></div>
        <div><strong>{Math.max(...exhibit.wearers.map(wearer => wearer.to))}</strong><span>latest listed season</span></div>
      </div>

      <div className="exhibit-related">
        <span className="eyebrow">Who wore #{exhibit.number}?</span>
        <div className="related-grid">
          {exhibit.wearers.map(wearer => {
            const href = wearerHref(wearer);
            const content = (
              <>
                <small>{years(wearer.from, wearer.to)}</small>
                <strong>{wearer.name}</strong>
                <b>{href ? "Open Vault record →" : "Reference record"}</b>
              </>
            );
            return href ? (
              <Link className="related-card" href={href} key={`${wearer.name}:${wearer.from}:${wearer.to}`}>{content}</Link>
            ) : (
              <div className="related-card" key={`${wearer.name}:${wearer.from}:${wearer.to}`}>{content}</div>
            );
          })}
        </div>
      </div>

      <p className="fine-print">This page reproduces factual uniform-number assignments and season ranges, not article prose. Storage: {exhibit.database ? "connected Postgres number record" : "versioned fallback number record"}.</p>
    </section>
  );
}
