import type { Metadata } from "next";
import { timeline } from "@/data/timeline";
import { SectionTitle } from "@/components/SectionTitle";

export const metadata: Metadata = { title: "Timeline" };

export default function TimelinePage() {
  return <section className="section shell page-top">
    <SectionTitle eyebrow="1960 → Today" title="Franchise Timeline">Every major event becomes a source-backed record that can connect to seasons, people, games and artifacts.</SectionTitle>
    <div className="timeline-list">
      {timeline.map(event => <article className="timeline-row" key={event.date + event.title}>
        <div className="timeline-year"><strong>{event.year}</strong><span>{event.era}</span></div>
        <div><span className="tag">{event.category}</span><h3>{event.title}</h3><p>{event.summary}</p><a href={event.sourceUrl} target="_blank" rel="noopener noreferrer">{event.sourceLabel} ↗</a></div>
      </article>)}
    </div>
  </section>;
}
