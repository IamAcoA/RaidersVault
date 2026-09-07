import type { Metadata } from "next";
import Link from "next/link";
import { SectionTitle } from "@/components/SectionTitle";
import { getRecordsArchive, recordHref } from "@/lib/records-db";

export const metadata: Metadata = { title: "Records & Stats" };
export const revalidate = 300;

export default async function RecordsPage() {
  const archive = await getRecordsArchive();

  return (
    <section className="section shell page-top">
      <SectionTitle eyebrow="Franchise record book" title="Records & Stats">
        Source-backed Raiders career leaderboards and franchise benchmarks. These records come from official Raiders career-leader tables, with franchise totals cross-checked against Pro Football Reference.
      </SectionTitle>

      <div className="stats-grid standalone-stats">
        {archive.snapshot.slice(0, 4).map(item => (
          <div key={item.label}><strong>{item.value}</strong><span>{item.label}</span></div>
        ))}
      </div>

      <div className="exhibit-related">
        <span className="eyebrow">Franchise snapshot</span>
        <div className="related-grid">
          {archive.snapshot.map(item => {
            const href = recordHref(item);
            const body = <><small>{item.detail}</small><strong>{item.value}</strong><span>{item.label}</span>{href ? <b>Open Vault record →</b> : null}</>;
            return href
              ? <Link className="related-card" href={href} key={item.label}>{body}</Link>
              : <div className="related-card" key={item.label}>{body}</div>;
          })}
        </div>
      </div>

      <div className="exhibit-related">
        <span className="eyebrow">Jump to a leaderboard</span>
        <div className="related-grid">
          {archive.categories.map(category => (
            <a className="related-card" href={`#${category.slug}`} key={category.slug}>
              <small>{category.stat}</small>
              <strong>{category.title}</strong>
              <span>{category.leaders[0]?.name} · {category.leaders[0]?.value}</span>
              <b>Open leaderboard ↓</b>
            </a>
          ))}
        </div>
      </div>

      {archive.categories.map(category => (
        <div className="exhibit-related game-collection-section" id={category.slug} key={category.slug}>
          <SectionTitle eyebrow={category.stat} title={category.title}>
            {category.note ?? `Top 10 Raiders career leaders by ${category.stat.toLowerCase()}.`}
          </SectionTitle>
          <div className="game-list">
            {category.leaders.map((leader, index) => {
              const href = recordHref(leader);
              const row = (
                <>
                  <div><span>#{leader.rank}</span><strong>{leader.value}</strong></div>
                  <div><small>{leader.detail}</small><h3>{leader.name}</h3></div>
                  <div className="game-score win"><span>{category.stat}</span><strong>{leader.value}</strong></div>
                </>
              );
              return href
                ? <Link className="game-row" href={href} key={`${category.slug}:${leader.name}:${index}`}>{row}</Link>
                : <div className="game-row" key={`${category.slug}:${leader.name}:${index}`}>{row}</div>;
            })}
          </div>
        </div>
      ))}

      <p className="fine-print">
        Career leaderboards: <a href={archive.sourceUrl} target="_blank" rel="noopener noreferrer">{archive.sourceLabel} ↗</a>. Franchise snapshot: <a href={archive.snapshotSourceUrl} target="_blank" rel="noopener noreferrer">{archive.snapshotSourceLabel} ↗</a>. Source check: {archive.checked}. Storage: {archive.database ? "connected Postgres record graph" : "versioned fallback records"}.
      </p>
    </section>
  );
}
