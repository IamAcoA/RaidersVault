import type { Metadata } from "next";
import { SectionTitle } from "@/components/SectionTitle";
import { VaultSearch } from "@/components/VaultSearch";
import { getVaultDocuments } from "@/lib/vault-db";

export const metadata: Metadata = { title: "Vault Search" };
export const revalidate = 300;

export default async function VaultPage() {
  const { documents, database } = await getVaultDocuments();
  const seasons = documents.filter(d => d.type === "season").length;
  const people = documents.filter(d => d.type === "player" || d.type === "legend").length;
  const numbers = documents.filter(d => d.type === "number").length;
  const places = documents.filter(d => d.type === "venue" || d.type === "era").length;

  return (
    <section className="section shell page-top">
      <SectionTitle eyebrow="Search layer" title="The Vault">Search the structured archive by player, legend, era, season, venue, uniform number, game, championship, rivalry, moment, year, opponent, coach or historical phrase. Try “who wore 32?”, “Los Angeles era” or “Oakland Coliseum.” The index is generated from Raiders Vault records{database ? " stored in Postgres" : " with a versioned fallback"}.</SectionTitle>
      <VaultSearch documents={documents} />
      <div className="stats-grid standalone-stats">
        <div><strong>{documents.length}</strong><span>search records</span></div>
        <div><strong>{people}</strong><span>people</span></div>
        <div><strong>{seasons}</strong><span>seasons</span></div>
        <div><strong>{places}</strong><span>eras & venues</span></div>
      </div>
      <p className="fine-print">Numbers currently include seven complete histories. Storage: {database ? "Render Postgres is connected. The archive is being served from the database with source-backed facts and graceful fallback." : "versioned fallback data. The site remains available while the database connection is being configured."}</p>
    </section>
  );
}
