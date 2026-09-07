import type { Metadata } from "next";
import Link from "next/link";
import { SectionTitle } from "@/components/SectionTitle";
import { getNumberArchive } from "@/lib/numbers-db";

export const metadata: Metadata = { title: "Numbers" };
export const revalidate = 300;

export default async function NumbersPage() {
  const { rows, database } = await getNumberArchive();
  const wearerTotal = rows.reduce((sum, item) => sum + item.wearerCount, 0);

  return (
    <section className="section shell page-top">
      <SectionTitle eyebrow="Uniform history" title="Numbers">
        Source-backed Raiders uniform-number histories. This first release contains seven complete number records; more numbers will be added without changing the archive model.
      </SectionTitle>

      <div className="stats-grid standalone-stats">
        <div><strong>{rows.length}</strong><span>complete number histories</span></div>
        <div><strong>{wearerTotal}</strong><span>wearer records</span></div>
        <div><strong>#32</strong><span>19 Raiders indexed</span></div>
        <div><strong>#24</strong><span>12 Raiders indexed</span></div>
      </div>

      <div className="related-grid">
        {rows.map(item => (
          <Link className="related-card" href={`/numbers/${item.number}`} key={item.number}>
            <small>Uniform number</small>
            <strong>#{item.number}</strong>
            <span>{item.wearerCount} Raiders in the reference history</span>
            <b>Open number →</b>
          </Link>
        ))}
      </div>

      <p className="fine-print">Source: Pro Football Reference team-specific Raiders uniform-number histories, checked September 6, 2026. Storage: {database ? "connected Postgres number records" : "versioned fallback number records"}.</p>
    </section>
  );
}
