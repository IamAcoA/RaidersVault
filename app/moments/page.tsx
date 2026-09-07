import type { Metadata } from "next";
import Link from "next/link";
import { moments } from "@/data/moments";
import { SectionTitle } from "@/components/SectionTitle";

export const metadata: Metadata = { title: "Moments" };

export default function MomentsPage() {
  return (
    <section className="section shell page-top" data-reveal>
      <SectionTitle eyebrow="The mythology" title="Moments">
        Signature plays and championship moments are preserved as source-backed records and connected to the exact games where they happened. Hover a moment to surface the game context before entering the exhibit.
      </SectionTitle>
      <div className="moment-grid">
        {moments.map(moment => (
          <article
            className="moment-card"
            key={moment.slug}
            data-preview-title={moment.title}
            data-preview-meta={`${moment.date}${moment.opponent ? ` · vs. ${moment.opponent}` : ""} · ${moment.summary}`}
            data-preview-kicker="Raiders moment"
            data-preview-art={moment.date.slice(2, 4)}
          >
            <span className="date">{moment.date}</span>
            <h3>{moment.title}</h3>
            {moment.opponent ? <strong>vs. {moment.opponent}</strong> : null}
            <p>{moment.summary}</p>
            <div className="tag-row">{moment.tags.map(tag => <span className="tag" key={tag}>{tag}</span>)}</div>
            <div className="card-actions">
              <Link href={`/moments/${moment.slug}`}>Open exhibit →</Link>
              {moment.gameSlug ? <Link href={`/games/${moment.gameSlug}`}>Game record →</Link> : null}
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
