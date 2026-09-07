import type { Metadata } from "next";
import Link from "next/link";
import { getAlDavisCollection } from "@/lib/al-davis-db";

export const metadata: Metadata = { title: "The Al Davis Collection" };
export const revalidate = 300;

export default async function AlDavisCollectionPage() {
  const collection = await getAlDavisCollection();

  return (
    <section className="section shell page-top exhibit-page">
      <Link className="exhibit-back" href="/legends/al-davis">← Al Davis legend record</Link>
      <div className="exhibit-hero">
        <div>
          <span className="eyebrow">Special collection · Raiders leadership history</span>
          <h1>{collection.title}</h1>
          <p>{collection.summary}</p>
        </div>
        <div className="exhibit-plaque">
          <span>COLLECTION</span>
          <strong>{collection.lifespan}</strong>
          <small>{collection.subtitle}</small>
          <a href={collection.sourceUrl} target="_blank" rel="noopener noreferrer">Primary source: {collection.sourceLabel} ↗</a>
          <a href={collection.hallOfFameUrl} target="_blank" rel="noopener noreferrer">Raiders Hall of Fame feature ↗</a>
        </div>
      </div>

      <div className="stats-grid standalone-stats">
        <div><strong>{collection.milestones.length}</strong><span>source-backed milestones</span></div>
        <div><strong>1963</strong><span>Raiders leadership begins</span></div>
        <div><strong>3</strong><span>Super Bowl championships</span></div>
        <div><strong>1992</strong><span>Hall of Fame induction</span></div>
      </div>

      <div className="timeline-list">
        {collection.milestones.map(milestone => (
          <article className="timeline-row" id={milestone.slug} key={milestone.slug}>
            <div className="timeline-year">
              <strong>{milestone.year}</strong>
              <span>{milestone.date}</span>
            </div>
            <div>
              <span className="tag">Al Davis Collection</span>
              <h3>{milestone.title}</h3>
              <p>{milestone.summary}</p>
              {milestone.links.length ? (
                <div className="exhibit-related">
                  <div className="related-grid">
                    {milestone.links.map(link => (
                      <Link className="related-card" href={link.href} key={`${milestone.slug}:${link.href}`}>
                        <small>Connected record</small>
                        <strong>{link.label}</strong>
                        <b>Open record →</b>
                      </Link>
                    ))}
                  </div>
                </div>
              ) : null}
              <a href={milestone.sourceUrl} target="_blank" rel="noopener noreferrer">{milestone.sourceLabel} ↗</a>
            </div>
          </article>
        ))}
      </div>

      <p className="fine-print">Collection storage: {collection.database ? "connected Postgres milestone graph" : "versioned fallback collection"}. Milestones summarize source-backed historical records and link to RaidersVault exhibits where those records already exist.</p>
    </section>
  );
}
