"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import type { VaultSearchDocument } from "@/lib/types";

const STOP_WORDS = new Set(["a","an","and","the","of","to","for","in","on","at","who","what","when","where","show","me","every","all","did","was","were","is","are"]);

function normalize(value: string): string {
  return value.toLowerCase().replace(/#/g, " number ").replace(/[^a-z0-9]+/g, " ").replace(/\s+/g, " ").trim();
}

function tokens(value: string): string[] {
  return normalize(value).split(" ").filter(token => token && !STOP_WORDS.has(token));
}

function score(doc: VaultSearchDocument, query: string): number {
  const q = normalize(query);
  if (!q) return 0;
  const title = normalize(doc.title);
  const subtitle = normalize(doc.subtitle);
  const text = normalize(doc.text);
  let points = 0;

  if (title === q) points += 120;
  if (title.startsWith(q)) points += 70;
  if (title.includes(q)) points += 45;
  if (subtitle.includes(q)) points += 20;

  const queryTokens = tokens(query);
  for (const token of queryTokens) {
    if (title === token) points += 30;
    else if (title.includes(token)) points += 18;
    if (subtitle.includes(token)) points += 9;
    if (text.includes(token)) points += 6;
    if (/^\d{2,4}$/.test(token) && String(doc.year ?? "") === token) points += 30;
  }

  if (queryTokens.length && queryTokens.every(token => text.includes(token))) points += 25;
  return points;
}

function previewArt(doc: VaultSearchDocument) {
  if (doc.year) return String(doc.year).slice(-2);
  return doc.type.replace(/[^a-z]/gi, "").slice(0, 3).toUpperCase() || "RV";
}

export function VaultSearch({ documents }: { documents: VaultSearchDocument[] }) {
  const [query, setQuery] = useState("");
  const results = useMemo(() => {
    if (!query.trim()) return [];
    return documents
      .map(doc => ({ doc, score: score(doc, query) }))
      .filter(item => item.score > 0)
      .sort((a, b) => b.score - a.score || a.doc.title.localeCompare(b.doc.title))
      .slice(0, 14)
      .map(item => item.doc);
  }, [documents, query]);

  return (
    <div className="search-shell">
      <label className="vault-search-box">
        <span className="sr-only">Search Raiders Vault</span>
        <input value={query} onChange={event => setQuery(event.target.value)} placeholder='Try “John Madden”, “Super Bowl XV”, “who wore 32” or “1983 championship”…' />
        <b>⌕</b>
      </label>
      {query.trim() ? (
        <div className="search-results" aria-live="polite">
          <p className="fine-print">{results.length ? `${results.length} best matches` : "No matches in the current archive."}</p>
          {results.map(result => (
            <Link
              className="search-result"
              href={result.href}
              key={result.id}
              data-preview-title={result.title}
              data-preview-meta={result.subtitle}
              data-preview-kicker={`${result.type} record`}
              data-preview-art={previewArt(result)}
            >
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
