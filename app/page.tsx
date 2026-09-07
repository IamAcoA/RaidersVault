import Link from "next/link";
import { SectionTitle } from "@/components/SectionTitle";
import { CoverageCard } from "@/components/CoverageCard";
import { TodayInHistory } from "@/components/TodayInHistory";
import { timeline } from "@/data/timeline";
import { getLiveCoverage } from "@/lib/coverage-live";

const doors = [
  { title: "Timeline", copy: "Every era, mapped.", href: "/timeline", art: "60", kicker: "1960 → today" },
  { title: "Seasons", copy: "Year-by-year history.", href: "/seasons", art: "67", kicker: "Franchise chronology" },
  { title: "Games", copy: "Postseason, classics and rivalry ledgers.", href: "/games", art: "W", kicker: "Scores become stories" },
  { title: "Legends", copy: "The Hall of Fame wing.", href: "/legends", art: "HOF", kicker: "People who defined the shield" },
  { title: "Championship Room", copy: "The title years and trophy case.", href: "/championships", art: "III", kicker: "Four championship records" },
  { title: "Players", copy: "Featured Raiders and career records.", href: "/players", art: "#", kicker: "Careers in context" },
  { title: "Moments", copy: "Games that became mythology.", href: "/moments", art: "OT", kicker: "Plays Raider Nation remembers" },
  { title: "Vault Search", copy: "Find people, years and connected events.", href: "/vault", art: "?", kicker: "Search the graph" },
  { title: "Around Raider Nation", copy: "Trusted links, not copied stories.", href: "/coverage", art: "NOW", kicker: "Living coverage layer" }
] as const;

const eras = ["OAKLAND 1960–1981", "LOS ANGELES 1982–1994", "OAKLAND 1995–2019", "LAS VEGAS 2020–PRESENT"] as const;

export default async function Home() {
  const topCoverage = await getLiveCoverage(2);
  const featured = timeline[timeline.length - 1];

  return (
    <>
      <section className="hero" data-reveal>
        <div className="shell hero-inner">
          <div className="hero-copy">
            <span className="eyebrow">1960 — FOREVER</span>
            <h1>RAIDERS<br /><em>VAULT</em></h1>
            <p>A living, source-backed archive of the franchise: seasons, players, games, moments, championships, culture and the stories still being written.</p>
            <div className="hero-actions">
              <Link className="button primary" href="/vault">Open the Vault</Link>
              <Link className="button ghost" href="/games">Explore Games</Link>
            </div>
          </div>
          <div className="hero-side-stack">
            <div
              className="hero-plaque"
              aria-label="Archive principles"
              data-preview-title="The archive code"
              data-preview-meta="Every historical claim stays connected to its source, its era and the people around it."
              data-preview-kicker="How Raiders Vault thinks"
              data-preview-art="RV"
            >
              <span>THE ARCHIVE CODE</span>
              <strong>Preserve facts.<br />Credit sources.<br />Connect history.</strong>
              <small>Independent • Source-backed • Built to update itself</small>
            </div>
            <TodayInHistory />
          </div>
        </div>
      </section>

      <section className="ticker ticker-immersive" aria-label="Franchise eras">
        <div className="shell ticker-inner">
          <div className="ticker-track">
            {eras.map(era => <span key={`a-${era}`}>{era}</span>)}
            <b>◆</b>
            <div aria-hidden="true" style={{ display: "contents" }}>
              {eras.map(era => <span key={`b-${era}`}>{era}</span>)}
              <b>◆</b>
            </div>
          </div>
        </div>
      </section>

      <section className="section shell" data-reveal>
        <SectionTitle eyebrow="Open the archive" title="Nine ways into Raiders history">Move through the cards. The archive now reacts to your cursor and surfaces context before you click.</SectionTitle>
        <div className="door-grid">
          {doors.map((door, index) => (
            <Link
              href={door.href}
              key={door.href}
              className="door-card"
              data-preview-title={door.title}
              data-preview-meta={door.copy}
              data-preview-kicker={door.kicker}
              data-preview-art={door.art}
            >
              <span>{String(index + 1).padStart(2, "0")}</span>
              <h3>{door.title}</h3>
              <p>{door.copy}</p>
              <b>Enter →</b>
            </Link>
          ))}
        </div>
      </section>

      <section className="section feature-band" data-reveal>
        <div className="shell feature-grid">
          <SectionTitle eyebrow="From the timeline" title={featured.title}>{featured.summary}</SectionTitle>
          <div className="year-stamp"><span>{featured.era}</span><strong>{featured.year}</strong><a href={featured.sourceUrl} target="_blank" rel="noopener noreferrer">Source: {featured.sourceLabel} ↗</a></div>
        </div>
      </section>

      <section className="section shell" data-reveal>
        <SectionTitle eyebrow="Around Raider Nation" title="Current coverage, automatically curated">Raiders Vault checks approved feeds, ranks for trust and freshness, deduplicates repeated stories and sends readers to the original publisher.</SectionTitle>
        <div className="coverage-grid">{topCoverage.map(item => <CoverageCard key={item.id} item={item} />)}</div>
        <p className="fine-print">Only titles, source metadata and our own short routing copy are displayed. Article bodies are not republished.</p>
      </section>
    </>
  );
}
