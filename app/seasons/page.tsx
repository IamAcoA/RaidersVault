import type { Metadata } from "next";
import { seasons } from "@/data/seasons";
import { SectionTitle } from "@/components/SectionTitle";

export const metadata: Metadata = { title: "Seasons" };

export default function SeasonsPage() {
  return <section className="section shell page-top">
    <SectionTitle eyebrow="Year by year" title="Seasons">The first seed seasons prove the record model. The ingestion phase will expand this to every season from 1960 forward.</SectionTitle>
    <div className="table-wrap"><table><thead><tr><th>Year</th><th>City</th><th>Record</th><th>Head coach</th><th>Finish</th><th>Note</th></tr></thead><tbody>{seasons.map(s => <tr key={s.year}><td><strong>{s.year}</strong></td><td>{s.location}</td><td>{s.record}</td><td>{s.coach}</td><td>{s.finish}</td><td>{s.note}</td></tr>)}</tbody></table></div>
  </section>;
}
