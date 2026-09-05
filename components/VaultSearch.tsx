"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import type { VaultSearchDocument } from "@/lib/types";

function score(doc: VaultSearchDocument, query: string): number {
  const q = query.toLowerCase().trim();
  if (!q) return 0;
  const title = doc.title.toLowerCase();
  const text = doc.text.toLowerCase();
  let points = 0;
  if (title === q) points += 100;
  if (title.startsWith(q)) points += 60;
  if (title.includes(q)) points += 40;
  for (const token of q.split(/\s+/).filter(Boolean)) {
    if (title.includes(token)) points += 15;
    if (text.includes(token)) points += 5;
  }
  return points;
}

export function VaultSearch({ documents }: { documents: VaultSearchDocument[] }) {
  const [query, setQuery] = useState("");
  const results = useMemo(() => {
    if (!query.trim()) return [];
    return documents
      .map(doc => ({ doc, score: score(doc, query) }))
      .filter(item => item.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, 12)
      .map(item => item.doc);
  }, [documents, query]);

  return (
    <div className="search-shell">
      <label className="vault-search-box">
        <span className="sr-only">Search Raiders Vault</span>
        <input value={query} onChange={event => setQuery(event.target.value)} placeholder='Search “Marcus Allen”, “1983”, “Super Bowl XI”…' />
        <b>⌕</b>
      </label>
      {query.trim() ? (
        <div className="search-results" aria-live="polite">
          <p className="fine-print">{results.length ? `${results.length} best matches` : "No matches in the current archive."}</p>
          {results.map(result => (
            <Link className="search-result" href={result.href} key={result.id}>
              <span>{result.type}</span>
              <div><strong>{result.title}</strong><small>{result.subtitle}</small></div>
              <b>→</b>
            </Link>
          ))}
        </div>
      ) : null}
    </div>
  );
}
