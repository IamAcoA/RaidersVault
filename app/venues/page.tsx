import type { Metadata } from "next";
import Link from "next/link";
import { SectionTitle } from "@/components/SectionTitle";
import { getVenueArchive } from "@/lib/venues-db";

export const metadata: Metadata = { title: "Venues" };
export const revalidate = 300;

function rangeLabel(ranges: Array<{ start: number; end: number; partial?: boolean; ongoing?: boolean }>) {
  return ranges.map(range => `${range.start}${range.start === range.end ? "" : `–${range.end}`}${range.partial ? " (partial)" : ""}${range.ongoing ? "+" : ""}`).join(" · ");
}

export default async function VenuesPage() {
  const { rows, database } = await getVenueArchive();
  return (
    <section className="section shell page-top">
      <SectionTitle eyebrow="Home fields across the franchise" title="Venues">
        From Kezar and Candlestick to the two Oakland Coliseum eras, Los Angeles and Allegiant Stadium. Each record connects home-season ranges to the games currently indexed in RaidersVault.
      </SectionTitle>
      <div className="related-grid">
        {rows.map(venue => (
          <Link className="related-card" href={`/venues/${venue.slug}`} key={venue.slug}>
            <small>{venue.city}</small>
            <strong>{venue.name}</strong>
            <span>{rangeLabel(venue.homeRanges)}</span>
            <b>Open venue →</b>
          </Link>
        ))}
      </div>
      <p className="fine-print">Historical home chronology is sourced from Raiders.com. Storage: {database ? "connected Postgres venue records" : "versioned fallback venue records"}.</p>
    </section>
  );
}
