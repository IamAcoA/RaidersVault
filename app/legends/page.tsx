import type { Metadata } from "next";
import { SectionTitle } from "@/components/SectionTitle";
import { getLegendsArchive } from "@/lib/legend-db";

export const metadata: Metadata = { title: "Legends" };
export const revalidate = 300;

const roleLabel = (role: string) => role === "executive" ? "Executive" : role === "coach" ? "Coach" : "Player";

export default async function LegendsPage() {
  const { rows, database } = await getLegendsArchive();
  return (
    <section className="section shell page-top">
      <SectionTitle eyebrow="Hall of Fame wing" title="Raiders Legends">
        The Pro Football Hall of Fame currently lists these members as Raiders franchise Hall of Famers. This collection is source-backed and will grow into deeper individual exhibits.
      </SectionTitle>
      <p className="fine-print">Archive source: {database ? "Render Postgres" : "versioned fallback"} · {rows.length} Hall of Fame members</p>
      <div className="person-grid">
        {rows.map(person => (
          <article className="person-card" key={person.slug}>
            <div className="number">HOF</div>
            <span>{roleLabel(person.role)}{person.details ? ` • ${person.details}` : ""}</span>
            <h3>{person.name}</h3>
            <p>{person.collection}</p>
            <a href={person.sourceUrl} target="_blank" rel="noopener noreferrer">Source: {person.sourceLabel} ↗</a>
          </article>
        ))}
      </div>
    </section>
  );
}
