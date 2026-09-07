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
  const draft = documents.filter(d => d.type === "draft").length;

  return (
    <section className="section shell page-top">
      <SectionTitle eyebrow="Search layer" title="The Vault">Search the structured archive by player, legend, era, season, venue, uniform number, record, draft pick, game, championship, rivalry, moment, year, opponent, coach or historical phrase. Try “who wore 32?”, “2014 draft”, “Maxx Crosby draft”, “Tim Brown receiving record”, “Battle of the Bay” or “Oakland Coliseum.” The index is generated from Raiders Vault records{database ? " stored in Postgres" : " with a versioned fallback"}.</SectionTitle>
      <VaultSearch documents={documents} />
      <div className="stats-grid standalone-stats">
        <div><strong>{documents.length}</strong><span>search records</span></div>
        <div><strong>{people}</strong><span>people</span></div>
        <div><strong>{seasons}</strong><span>seasons</span></div>
        <div><strong>{draft}</strong><span>draft search records</span></div>
      </div>
      <p className="fine-print">Numbers currently include seven complete histories; Records includes a franchise snapshot and seven career leaderboards; Draft History now has complete year-by-year classes from 2014 through 2026 plus the 12 Raiders-drafted Hall of Famers. Storage: {database ? "Render Postgres is connected. The archive is being served from the database with source-backed facts and graceful fallback." : "versioned fallback data. The site remains available while the database connection is being configured."}</p>
    </section>
  );
}
