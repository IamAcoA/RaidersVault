import type { Metadata } from "next";
import Link from "next/link";
import { SectionTitle } from "@/components/SectionTitle";
import { draftPickHref, getDraftArchive, type DraftPickRecord } from "@/lib/draft-db";

export const metadata: Metadata = { title: "Draft History" };
export const revalidate = 300;

const pickLabel = (round: number | null, pick: number | null) => round == null || pick == null ? "Historical selection" : `Round ${round} · Pick ${pick}`;
const slugify = (value: string) => value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
const draftAnchor = (pick: DraftPickRecord, collection: "current-class" | "hall-of-fame") => `draft-${pick.year}-${collection}-${pick.pick == null ? "historical" : `pick-${pick.pick}`}-${slugify(pick.player)}`;

export default async function DraftPage() {
  const archive = await getDraftArchive();

  return (
    <section className="section shell page-top">
      <SectionTitle eyebrow="How the roster was built" title="Draft History">
        A source-backed draft archive. This first graph release preserves the complete 2026 class and the 12 Raiders-drafted players who reached the Pro Football Hall of Fame; the same model will expand year by year.
      </SectionTitle>

      <div className="stats-grid standalone-stats">
        {archive.facts.map(item => <div key={item.label}><strong>{item.value}</strong><span>{item.label}</span></div>)}
      </div>

      <div className="exhibit-related game-collection-section">
        <SectionTitle eyebrow={`${archive.currentClass.year} NFL Draft`} title={`${archive.currentClass.year} Draft Class`}>
          Every Raiders selection listed on the official franchise Draft History page for {archive.currentClass.year}.
        </SectionTitle>
        <div className="game-list">
          {archive.currentClass.picks.map((pick, index) => (
            <div className="game-row" id={draftAnchor(pick, "current-class")} key={`${pick.year}:${pick.pick}:${pick.player}:${index}`}>
              <div><span>R{pick.round}</span><strong>#{pick.pick}</strong></div>
              <div><small>{pick.position} · {pick.college}{pick.note ? ` · ${pick.note}` : ""}</small><h3>{pick.player}</h3></div>
              <div className="game-score win"><span>OVERALL</span><strong>{pick.pick}</strong></div>
            </div>
          ))}
        </div>
      </div>

      <div className="exhibit-related game-collection-section">
        <SectionTitle eyebrow="Drafted by the Silver and Black" title="Hall of Fame Draft Lineage">
          Twelve players drafted by the Raiders went on to the Pro Football Hall of Fame. The 1968 class alone produced Ken Stabler and Art Shell.
        </SectionTitle>
        <div className="related-grid">
          {archive.hallOfFamePicks.map((pick, index) => {
            const href = draftPickHref(pick);
            const id = draftAnchor(pick, "hall-of-fame");
            const card = <><small>{pick.year} · {pickLabel(pick.round, pick.pick)}</small><strong>{pick.player}</strong><span>{pick.note ?? "Raiders-drafted Hall of Famer"}</span>{href ? <b>Open Hall of Fame exhibit →</b> : null}</>;
            return href
              ? <Link className="related-card" href={href} id={id} key={`${pick.year}:${pick.player}:${index}`}>{card}</Link>
              : <div className="related-card" id={id} key={`${pick.year}:${pick.player}:${index}`}>{card}</div>;
          })}
        </div>
      </div>

      <p className="fine-print">
        Official year-by-year selections: <a href={archive.sourceUrl} target="_blank" rel="noopener noreferrer">{archive.sourceLabel} ↗</a>. Historical draft facts and Hall of Fame lineage: <a href={archive.historySourceUrl} target="_blank" rel="noopener noreferrer">{archive.historySourceLabel} ↗</a>. Source check: {archive.checked}. Storage: {archive.database ? "connected Postgres draft-pick graph" : "versioned fallback draft records"}.
      </p>
    </section>
  );
}
