import type { Metadata } from "next";
import { players } from "@/data/players";
import { SectionTitle } from "@/components/SectionTitle";

export const metadata: Metadata = { title: "Players" };

export default function PlayersPage() {
  return <section className="section shell page-top"><SectionTitle eyebrow="People of the franchise" title="Players">A starter collection of legends. The final system will include every player with connected seasons, numbers, games, honors and sources.</SectionTitle><div className="person-grid">{players.map(p => <article className="person-card" key={p.slug}><div className="number">{p.number ?? "—"}</div><span>{p.position} • {p.years}</span><h3>{p.name}</h3><p>{p.distinction}</p></article>)}</div></section>;
}
