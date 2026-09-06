import Link from "next/link";
import { SectionTitle } from "@/components/SectionTitle";
import { CoverageCard } from "@/components/CoverageCard";
import { TodayInHistory } from "@/components/TodayInHistory";
import { timeline } from "@/data/timeline";
import { getLiveCoverage } from "@/lib/coverage-live";

const doors = [
  ["Timeline", "Every era, mapped.", "/timeline"],
  ["Seasons", "Year-by-year history.", "/seasons"],
  ["Legends", "The Hall of Fame wing.", "/legends"],
  ["Championship Room", "The title years and trophy case.", "/championships"],
  ["Players", "Featured Raiders and career records.", "/players"],
  ["Moments", "Games that became mythology.", "/moments"],
  ["Vault Search", "Find people, years and events.", "/vault"],
  ["Around Raider Nation", "Trusted links, not copied stories.", "/coverage"]
] as const;

export default async function Home() {
  const topCoverage = await getLiveCoverage(2);
  const featured = timeline[timeline.length - 1];

  return (
    <>
      <section className="hero">
        <div className="shell hero-inner">
          <div className="hero-copy">
            <span className="eyebrow">1960 — FOREVER</span>
            <h1>RAIDERS<br /><em>VAULT</em></h1>
            <p>A living, source-backed archive of the franchise: seasons, players, games, moments, championships, culture and the stories still being written.</p>
            <div className="hero-actions">
              <Link className="button primary" href="/vault">Open the Vault</Link>
              <Link className="button ghost" href="/championships">Enter Championship Room</Link>
            </div>
          </div>
          <div className="hero-side-stack">
            <div className="hero-plaque" aria-label="Archive principles">
              <span>THE ARCHIVE CODE</span>
              <strong>Preserve facts.<br />Credit sources.<br />Connect history.</strong>
              <small>Independent • Source-backed • Built to update itself</small>
            </div>
            <TodayInHistory />
          </div>
        </div>
      </section>

      <section className="ticker" aria-label="Franchise eras">
        <div className="shell ticker-inner"><span>OAKLAND 1960–1981</span><b>◆</b><span>LOS ANGELES 1982–1994</span><b>◆</b><span>OAKLAND 1995–2019</span><b>◆</b><span>LAS VEGAS 2020–PRESENT</span></div>
      </section>

      <section className="section shell">
        <SectionTitle eyebrow="Open the archive" title="Eight ways into Raiders history">The site is organized around connected records rather than disconnected blog posts.</SectionTitle>
        <div className="door-grid">
          {doors.map(([title, copy, href], index) => (
            <Link href={href} key={href} className="door-card">
              <span>{String(index + 1).padStart(2, "0")}</span><h3>{title}</h3><p>{copy}</p><b>Enter →</b>
            </Link>
          ))}
        </div>
      </section>

      <section className="section feature-band">
        <div className="shell feature-grid">
          <SectionTitle eyebrow="From the timeline" title={featured.title}>{featured.summary}</SectionTitle>
          <div className="year-stamp"><span>{featured.era}</span><strong>{featured.year}</strong><a href={featured.sourceUrl} target="_blank" rel="noopener noreferrer">Source: {featured.sourceLabel} ↗</a></div>
        </div>
      </section>

      <section className="section shell">
        <SectionTitle eyebrow="Around Raider Nation" title="Current coverage, automatically curated">Raiders Vault checks approved feeds, ranks for trust and freshness, deduplicates repeated stories and sends readers to the original publisher.</SectionTitle>
        <div className="coverage-grid">{topCoverage.map(item => <CoverageCard key={item.id} item={item} />)}</div>
        <p className="fine-print">Only titles, source metadata and our own short routing copy are displayed. Article bodies are not republished.</p>
      </section>
    </>
  );
}
