import type { Metadata } from "next";
import Link from "next/link";
import { SectionTitle } from "@/components/SectionTitle";
import { getSeasonArchive } from "@/lib/season-db";

export const metadata: Metadata = { title: "Seasons" };
export const revalidate = 300;

const dash = (value: string) => value || "—";

export default async function SeasonsPage() {
  const { rows, database } = await getSeasonArchive();

  return (
    <section className="section shell page-top">
      <SectionTitle eyebrow="Year by year" title="Seasons">
        Every Raiders season is indexed from 1960 forward. Open any year as its own exhibit; detailed fields appear only after the season facts have been verified and sourced.
      </SectionTitle>
      <p className="fine-print">Archive source: {database ? "Render Postgres" : "versioned fallback"} · {rows.length} seasons indexed</p>
      <div className="table-wrap">
        <table>
          <thead><tr><th>Year</th><th>City</th><th>Record</th><th>Head coach</th><th>Finish</th><th>Status</th><th>Note</th></tr></thead>
          <tbody>
            {rows.map(season => (
              <tr key={season.year}>
                <td><strong><Link href={`/seasons/${season.year}`}>{season.year}</Link></strong></td>
                <td>{season.location}</td>
                <td>{dash(season.record)}</td>
                <td>{dash(season.coach)}</td>
                <td>{dash(season.finish)}</td>
                <td><span className="tag">{season.status === "verified-detail" ? "Verified details" : "Indexed"}</span></td>
                <td>{season.note} <Link href={`/seasons/${season.year}`}>Open →</Link></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
