import type { Metadata } from "next";
import { SectionTitle } from "@/components/SectionTitle";
import { VaultSearch } from "@/components/VaultSearch";
import { getVaultDocuments } from "@/lib/vault-db";

export const metadata: Metadata = { title: "Vault Search" };
export const revalidate = 300;

export default async function VaultPage() {
  const { documents, database } = await getVaultDocuments();
  const players = documents.filter(d => d.type === "player").length;
  const seasons = documents.filter(d => d.type === "season").length;
  const moments = documents.filter(d => d.type === "moment").length;

  return (
    <section className="section shell page-top">
      <SectionTitle eyebrow="Search layer" title="The Vault">Search the structured archive by player, season, moment, year, opponent, coach or historical phrase. The index is generated from Raiders Vault records{database ? " stored in Postgres" : " with a versioned fallback"}.</SectionTitle>
      <VaultSearch documents={documents} />
      <div className="stats-grid standalone-stats">
        <div><strong>{documents.length}</strong><span>search records</span></div>
        <div><strong>{players}</strong><span>players</span></div>
        <div><strong>{seasons}</strong><span>seasons</span></div>
        <div><strong>{moments}</strong><span>moments</span></div>
      </div>
      <p className="fine-print">Storage: {database ? "Render Postgres is connected. The archive is being served from the database with source-backed facts and graceful fallback." : "versioned fallback data. The site remains available while the database connection is being configured."}</p>
    </section>
  );
}
