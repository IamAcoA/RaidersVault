import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getDraftYear, modernDraftYears } from "@/lib/draft-years-db";

export const revalidate = 300;

export function generateStaticParams() {
  return modernDraftYears().map(year => ({ year: String(year) }));
}

export async function generateMetadata({ params }: { params: Promise<{ year: string }> }): Promise<Metadata> {
  const { year } = await params;
  const archive = await getDraftYear(Number(year));
  return { title: archive ? `${archive.year} Raiders Draft` : "Draft History" };
}

export default async function DraftYearPage({ params }: { params: Promise<{ year: string }> }) {
  const { year: rawYear } = await params;
  const archive = await getDraftYear(Number(rawYear));
  if (!archive) notFound();
  const first = archive.picks[0];
  const rounds = new Set(archive.picks.map(pick => pick.round).filter((round): round is number => round != null));

  return (
    <section className="section shell page-top exhibit-page">
      <Link className="exhibit-back" href="/draft">← Draft History</Link>
      <div className="exhibit-hero championship-exhibit-hero">
        <div>
          <span className="eyebrow">Raiders Draft History · complete class</span>
          <h1>{archive.year}<br />NFL Draft</h1>
          <p>Every Raiders selection listed by the franchise for the {archive.year} NFL Draft, preserved as source-backed draft-pick records.</p>
        </div>
        <div className="exhibit-plaque">
          <span>DRAFT CLASS</span>
          <strong>{archive.picks.length} picks</strong>
          <small>{first ? `First selection: ${first.player}${first.pick ? ` · No. ${first.pick}` : ""}` : ""}</small>
          <a href={archive.sourceUrl} target="_blank" rel="noopener noreferrer">Primary source: {archive.sourceLabel} ↗</a>
        </div>
      </div>

      <div className="stats-grid standalone-stats">
        <div><strong>{archive.picks.length}</strong><span>selections</span></div>
        <div><strong>{rounds.size}</strong><span>rounds represented</span></div>
        <div><strong>{first?.round ?? "—"}</strong><span>first-pick round</span></div>
        <div><strong>{first?.pick ?? "—"}</strong><span>first-pick overall</span></div>
      </div>

      <div className="game-list">
        {archive.picks.map((pick, index) => (
          <div className="game-row" key={`${pick.year}:${pick.pick}:${pick.player}:${index}`}>
            <div><span>ROUND</span><strong>{pick.round ?? "—"}</strong></div>
            <div><small>{pick.position ?? "Position not listed"} · {pick.college ?? "College not listed"}{pick.note ? ` · ${pick.note}` : ""}</small><h3>{pick.player}</h3></div>
            <div className="game-score win"><span>OVERALL</span><strong>{pick.pick ?? "—"}</strong></div>
          </div>
        ))}
      </div>

      <p className="fine-print">Source check: {archive.checked}. Storage: {archive.database ? "connected Postgres draft-pick graph" : "versioned fallback draft class"}.</p>
    </section>
  );
}
