import type { Metadata } from "next";
import { SectionTitle } from "@/components/SectionTitle";
import { getChampionshipArchive } from "@/lib/championship-db";

export const metadata: Metadata = { title: "Championship Room" };
export const revalidate = 300;

export default async function ChampionshipsPage() {
  const { rows, database } = await getChampionshipArchive();
  const superBowls = rows.filter(row => row.level === "world");
  const leagueTitles = rows.filter(row => row.level === "league");

  return (
    <section className="section shell page-top">
      <SectionTitle eyebrow="The trophy case" title="Championship Room">
        The Raiders' title history, preserved as connected records: the 1967 AFL championship and victories in Super Bowls XI, XV and XVIII.
      </SectionTitle>
      <p className="fine-print">Archive source: {database ? "Render Postgres" : "versioned fallback"} · {rows.length} championship records</p>

      <div className="championship-grid">
        {superBowls.map(item => (
          <article className="championship-card" key={item.slug}>
            <span className="eyebrow">Season {item.season}</span>
            <strong>{item.score}</strong>
            <h3>{item.name}</h3>
            <p>{item.teamName} vs. {item.opponent}</p>
            <p>{item.summary}</p>
            {item.mvp ? <small>MVP: {item.mvp}</small> : null}
            <a href={item.sourceUrl} target="_blank" rel="noopener noreferrer">Source: {item.sourceLabel} ↗</a>
          </article>
        ))}
      </div>

      {leagueTitles.length ? (
        <div className="feature-band championship-league-band">
          <div className="feature-grid">
            <SectionTitle eyebrow="Before the Super Bowl era" title={leagueTitles[0].name}>{leagueTitles[0].summary}</SectionTitle>
            <div className="year-stamp"><span>{leagueTitles[0].teamName}</span><strong>{leagueTitles[0].score}</strong><a href={leagueTitles[0].sourceUrl} target="_blank" rel="noopener noreferrer">Source: {leagueTitles[0].sourceLabel} ↗</a></div>
          </div>
        </div>
      ) : null}
    </section>
  );
}
