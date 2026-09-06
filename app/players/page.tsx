import type { Metadata } from "next";
import Link from "next/link";
import { players } from "@/data/players";
import { SectionTitle } from "@/components/SectionTitle";

export const metadata: Metadata = { title: "Players" };

export default function PlayersPage() {
  return (
    <section className="section shell page-top">
      <SectionTitle eyebrow="People of the franchise" title="Players">
        Featured player records anchor the growing archive. Source-backed records open into connected exhibits; Hall of Fame players also connect to the Legends collection.
      </SectionTitle>
      <p className="fine-print"><Link href="/legends">Explore the Hall of Fame wing →</Link></p>
      <div className="person-grid">
        {players.map(p => {
          const href = p.sourceUrl ? `/players/${p.slug}` : `/legends/${p.slug}`;
          return (
            <article className="person-card" key={p.slug}>
              <div className="number">{p.number ?? "—"}</div>
              <span>{p.position} • {p.years}</span>
              <h3>{p.name}</h3>
              <p>{p.distinction}</p>
              <div className="card-actions"><Link href={href}>Open exhibit →</Link></div>
            </article>
          );
        })}
      </div>
    </section>
  );
}
