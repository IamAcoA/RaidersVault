import type { Metadata } from "next";
import Link from "next/link";
import { SectionTitle } from "@/components/SectionTitle";
import { getEraArchive } from "@/lib/eras-db";

export const metadata: Metadata = { title: "Eras" };
export const revalidate = 300;

export default async function ErasPage() {
  const { rows, database } = await getEraArchive();
  return (
    <section className="section shell page-top">
      <SectionTitle eyebrow="The franchise by place and time" title="Eras">
        Four chapters organize Raiders history by franchise location, seasons and home venues: Oakland I, Los Angeles, Oakland II and Las Vegas.
      </SectionTitle>
      <div className="related-grid">
        {rows.map(era => (
          <Link className="related-card" href={`/eras/${era.slug}`} key={era.slug}>
            <small>{era.startYear}–{era.endYear}{era.ongoing ? "+" : ""}</small>
            <strong>{era.name}</strong>
            <span>{era.location} · {era.endYear - era.startYear + 1} seasons</span>
            <b>Open era →</b>
          </Link>
        ))}
      </div>
      <p className="fine-print">Era boundaries follow the Raiders' franchise-location chronology. Storage: {database ? "connected Postgres era records" : "versioned fallback era records"}.</p>
    </section>
  );
}
