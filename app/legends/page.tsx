import type { Metadata } from "next";
import Link from "next/link";
import { SectionTitle } from "@/components/SectionTitle";
import { getLegendsArchive } from "@/lib/legend-db";

export const metadata: Metadata = { title: "Legends" };
export const revalidate = 300;

const roleLabel = (role: string) => role === "executive" ? "Executive" : role === "coach" ? "Coach" : "Player";
const initials = (name: string) => name.split(/\s+/).filter(Boolean).map(part => part[0]).join("").slice(0, 3).toUpperCase();

export default async function LegendsPage() {
  const { rows, database } = await getLegendsArchive();
  return (
    <section className="section shell page-top" data-reveal>
      <SectionTitle eyebrow="Hall of Fame wing" title="Raiders Legends">
        The Pro Football Hall of Fame currently lists these members as Raiders franchise Hall of Famers. Move across a card to surface a quick exhibit preview before opening the full connected record.
      </SectionTitle>
      <p className="fine-print">Archive source: {database ? "Render Postgres" : "versioned fallback"} · {rows.length} Hall of Fame members</p>
      <div className="person-grid">
        {rows.map(person => (
          <article
            className="person-card"
            key={person.slug}
            data-preview-title={person.name}
            data-preview-meta={`${roleLabel(person.role)}${person.details ? ` · ${person.details}` : ""} · Open the connected Hall of Fame exhibit.`}
            data-preview-kicker="Raiders legend"
            data-preview-art={initials(person.name)}
          >
            <div className="number">HOF</div>
            <span>{roleLabel(person.role)}{person.details ? ` • ${person.details}` : ""}</span>
            <h3>{person.name}</h3>
            <p>{person.collection}</p>
            <div className="card-actions">
              <Link href={`/legends/${person.slug}`}>Open exhibit →</Link>
              <a href={person.sourceUrl} target="_blank" rel="noopener noreferrer">Source ↗</a>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
