import type { Metadata } from "next";
import { SectionTitle } from "@/components/SectionTitle";
import { VaultSearch } from "@/components/VaultSearch";
import { getVaultDocuments } from "@/lib/vault-db";

export const metadata: Metadata = { title: "Vault Search" };
export const revalidate = 300;

export default async function VaultPage() {
  const { documents, database } = await getVaultDocuments();
  const seasons = documents.filter(d => d.type === "season").length;
  const games = documents.filter(d => d.type === "game").length;
  const people = documents.filter(d => d.type === "player" || d.type === "legend").length;

  return (
    <section className="section shell page-top">
      <SectionTitle eyebrow="Search layer" title="The Vault">Search the structured archive by player, legend, season, postseason game, championship, moment, year, opponent, coach or historical phrase. The index is generated from Raiders Vault records{database ? " stored in Postgres" : " with a versioned fallback"}.</SectionTitle>
      <VaultSearch documents={documents} />
      <div className="stats-grid standalone-stats">
        <div><strong>{documents.length}</strong><span>search records</span></div>
        <div><strong>{people}</strong><span>people</span></div>
        <div><strong>{seasons}</strong><span>seasons</span></div>
        <div><strong>{games}</strong><span>postseason games</span></div>
      </div>
      <p className="fine-print">Storage: {database ? "Render Postgres is connected. The archive is being served from the database with source-backed facts and graceful fallback." : "versioned fallback data. The site remains available while the database connection is being configured."}</p>
    </section>
  );
}
