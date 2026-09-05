import type { Metadata } from "next";
import { players } from "@/data/players";
import { seasons } from "@/data/seasons";
import { moments } from "@/data/moments";
import { timeline } from "@/data/timeline";
import { SectionTitle } from "@/components/SectionTitle";
import { VaultSearch } from "@/components/VaultSearch";
import { vaultIndex } from "@/lib/vault-index";

export const metadata: Metadata = { title: "Vault Search" };

export default function VaultPage() {
  const total = players.length + seasons.length + moments.length + timeline.length;
  return (
    <section className="section shell page-top">
      <SectionTitle eyebrow="Search layer" title="The Vault">Search the structured archive by player, season, moment, year, opponent, coach or historical phrase. This index is generated directly from Raiders Vault records.</SectionTitle>
      <VaultSearch documents={vaultIndex} />
      <div className="stats-grid standalone-stats">
        <div><strong>{total}</strong><span>seed records</span></div>
        <div><strong>{players.length}</strong><span>players</span></div>
        <div><strong>{seasons.length}</strong><span>seasons</span></div>
        <div><strong>{moments.length}</strong><span>moments</span></div>
      </div>
      <p className="fine-print">The repository now includes a normalized PostgreSQL schema for the future dedicated database. Search will migrate from this in-process index to database full-text and semantic retrieval without changing the page model.</p>
    </section>
  );
}
