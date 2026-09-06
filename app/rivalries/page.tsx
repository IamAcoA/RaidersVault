import type { Metadata } from "next";
import Link from "next/link";
import { SectionTitle } from "@/components/SectionTitle";
import { getRivalries } from "@/lib/rivalry-db";

export const metadata: Metadata = { title: "Rivalries" };
export const revalidate = 300;

export default async function RivalriesPage() {
  const { rows, database } = await getRivalries();
  return (
    <section className="section shell page-top">
      <SectionTitle eyebrow="The opponents that shaped the archive" title="Rivalries">
        Series identity comes from the Raiders' official matchup history. Game lists below each rivalry contain only records already indexed inside RaidersVault.
      </SectionTitle>
      <div className="related-grid">
        {rows.map(rivalry => (
          <Link className="related-card" href={`/rivalries/${rivalry.slug}`} key={rivalry.slug}>
            <small>{rivalry.kind} · since {rivalry.startYear}</small>
            <strong>Raiders vs. {rivalry.shortName}</strong>
            <span>{rivalry.seriesRecord}</span>
            {rivalry.postseasonRecord ? <span>{rivalry.postseasonRecord}</span> : null}
            <b>Open rivalry →</b>
          </Link>
        ))}
      </div>
      <p className="fine-print">Series records are sourced from Raiders.com and marked through the 2025 season. Storage: {database ? "connected Postgres rivalry records" : "versioned fallback records"}.</p>
    </section>
  );
}
