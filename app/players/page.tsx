import type { Metadata } from "next";
import Link from "next/link";
import { players } from "@/data/players";
import { SectionTitle } from "@/components/SectionTitle";

export const metadata: Metadata = { title: "Players" };

export default function PlayersPage() {
  return (
    <section className="section shell page-top">
      <SectionTitle eyebrow="People of the franchise" title="Players">
        Featured player records anchor the growing archive. Hall of Fame membership now lives in its own sourced Legends collection, while player records will continue expanding toward the full all-time roster.
      </SectionTitle>
      <p className="fine-print"><Link href="/legends">Explore the Hall of Fame wing →</Link></p>
      <div className="person-grid">
        {players.map(p => (
          <article className="person-card" key={p.slug}>
            <div className="number">{p.number ?? "—"}</div>
            <span>{p.position} • {p.years}</span>
            <h3>{p.name}</h3>
            <p>{p.distinction}</p>
          </article>
        ))}
      </div>
    </section>
  );
}
