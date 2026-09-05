import type { CoverageItem } from "@/lib/types";

export function CoverageCard({ item }: { item: CoverageItem }) {
  return (
    <article className="coverage-card">
      <div className="coverage-meta"><span>{item.type}</span><span>{item.publisher}</span></div>
      <h3>{item.title}</h3>
      <p>{item.description}</p>
      <a href={item.url} target="_blank" rel="noopener noreferrer">Open at source ↗</a>
    </article>
  );
}
