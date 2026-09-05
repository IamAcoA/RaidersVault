import type { Metadata } from "next";
import { sources } from "@/data/sources";
import { getLiveCoverage } from "@/lib/coverage-live";
import { CoverageCard } from "@/components/CoverageCard";
import { SectionTitle } from "@/components/SectionTitle";

export const metadata: Metadata = { title: "Coverage" };
export const revalidate = 1800;

export default async function CoveragePage() {
  const ranked = await getLiveCoverage(16);
  return (
    <section className="section shell page-top">
      <SectionTitle eyebrow="Around Raider Nation" title="Trusted outside coverage">A small, automatically refreshed layer of articles and podcasts. Raiders Vault links outward, preserves attribution and does not republish full stories or audio.</SectionTitle>
      <div className="coverage-grid">{ranked.map(item => <CoverageCard key={item.id} item={item} />)}</div>
      <div className="policy-box">
        <h3>Source registry</h3>
        <p>Every automated source has a trust score, ingestion method and copy policy. Failed feeds are skipped without breaking the site, and a versioned snapshot provides fallback content.</p>
        <ul>{sources.map(s => <li key={s.id}><strong>{s.name}</strong> — trust {s.trust}/5 — {s.ingestion} — {s.copyPolicy}{s.enabled ? "" : " — disabled"}</li>)}</ul>
      </div>
    </section>
  );
}
