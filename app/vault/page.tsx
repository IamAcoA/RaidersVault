import type { Metadata } from "next";
import { players } from "@/data/players";
import { seasons } from "@/data/seasons";
import { moments } from "@/data/moments";
import { timeline } from "@/data/timeline";
import { SectionTitle } from "@/components/SectionTitle";

export const metadata: Metadata = { title: "Vault Search" };

export default function VaultPage() {
  const total = players.length + seasons.length + moments.length + timeline.length;
  return <section className="section shell page-top"><SectionTitle eyebrow="Search layer" title="The Vault">The production version will use database-backed semantic and faceted search. This first build exposes the information architecture and record counts.</SectionTitle><div className="search-shell"><div className="fake-search">Search “Marcus Allen”, “1983”, “Super Bowl XI”… <span>⌕</span></div><div className="stats-grid"><div><strong>{total}</strong><span>seed records</span></div><div><strong>{players.length}</strong><span>players</span></div><div><strong>{seasons.length}</strong><span>seasons</span></div><div><strong>{moments.length}</strong><span>moments</span></div></div><p className="fine-print">Next engineering phase: PostgreSQL/Supabase, normalized entities, source provenance, full-text search and semantic search.</p></div></section>;
}
