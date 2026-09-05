import type { Metadata } from "next";
import { coverage } from "@/data/coverage";
import { sources } from "@/data/sources";
import { rankCoverage } from "@/lib/ranking";
import { CoverageCard } from "@/components/CoverageCard";
import { SectionTitle } from "@/components/SectionTitle";

export const metadata: Metadata = { title: "Coverage" };

export default function CoveragePage() {
  const ranked = rankCoverage(coverage, sources);
  return <section className="section shell page-top"><SectionTitle eyebrow="Around Raider Nation" title="Trusted outside coverage">Raiders Vault should organize and contextualize journalism, not copy it. Links open at the original publisher.</SectionTitle><div className="coverage-grid">{ranked.map(item => <CoverageCard key={item.id} item={item} />)}</div><div className="policy-box"><h3>Source policy</h3><p>Each source has a trust rating, ingestion method and copy policy. The production worker will reject disabled sources, deduplicate the same story, rank for recency and trust, and display only a small number of items.</p><ul>{sources.map(s => <li key={s.id}><strong>{s.name}</strong> — trust {s.trust}/5 — {s.ingestion} — {s.copyPolicy}</li>)}</ul></div></section>;
}
