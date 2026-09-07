import type { CoverageItem } from "@/lib/types";

export function CoverageCard({ item }: { item: CoverageItem }) {
  const date = new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric" }).format(new Date(item.publishedAt));
  return (
    <article
      className="coverage-card"
      data-preview-title={item.title}
      data-preview-meta={`${item.publisher} · ${date} · Opens at the original source.`}
      data-preview-kicker="Around Raider Nation"
      data-preview-art="NOW"
    >
      <div className="coverage-meta"><span>{item.type}</span><span>{item.publisher}</span></div>
      <h3>{item.title}</h3>
      <p>{item.description}</p>
      <div className="coverage-footer"><small>{date}</small><a href={item.url} target="_blank" rel="noopener noreferrer">Open at source ↗</a></div>
    </article>
  );
}
