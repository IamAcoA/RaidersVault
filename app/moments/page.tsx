import type { Metadata } from "next";
import { moments } from "@/data/moments";
import { SectionTitle } from "@/components/SectionTitle";

export const metadata: Metadata = { title: "Moments" };

export default function MomentsPage() {
  return <section className="section shell page-top"><SectionTitle eyebrow="The mythology" title="Moments">Signature games and plays become structured records instead of isolated articles.</SectionTitle><div className="moment-grid">{moments.map(m => <article className="moment-card" key={m.slug}><span className="date">{m.date}</span><h3>{m.title}</h3>{m.opponent ? <strong>vs. {m.opponent}</strong> : null}<p>{m.summary}</p><div className="tag-row">{m.tags.map(t => <span className="tag" key={t}>{t}</span>)}</div></article>)}</div></section>;
}
