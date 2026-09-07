export type Era = "Oakland I" | "Los Angeles" | "Oakland II" | "Las Vegas";

export interface ProvenanceRecord {
  sourceLabel: string;
  sourceUrl: string;
  accessedAt?: string;
  note?: string;
}

export interface TimelineEvent {
  date: string;
  year: number;
  title: string;
  summary: string;
  era: Era;
  category: "franchise" | "championship" | "game" | "leadership" | "relocation";
  sourceLabel: string;
  sourceUrl: string;
}

export interface Season {
  year: number;
  location: "Oakland" | "Los Angeles" | "Las Vegas";
  record: string;
  coach: string;
  finish: string;
  note: string;
  provenance?: ProvenanceRecord[];
}

export interface Player {
  slug: string;
  name: string;
  position: string;
  years: string;
  number?: string;
  distinction: string;
  sourceId?: string;
  sourceLabel?: string;
  sourceUrl?: string;
  provenance?: ProvenanceRecord[];
}

export interface Moment {
  slug: string;
  title: string;
  date: string;
  opponent?: string;
  summary: string;
  playDetail?: string;
  people?: string[];
  gameSlug?: string;
  championshipSlug?: string;
  sourceId?: string;
  sourceLabel?: string;
  sourceUrl?: string;
  tags: string[];
  provenance?: ProvenanceRecord[];
}

export interface SourceRecord {
  id: string;
  name: string;
  homepage: string;
  type: "official" | "news" | "podcast" | "reference";
  trust: 1 | 2 | 3 | 4 | 5;
  ingestion: "manual" | "rss" | "api" | "embed" | "metadata-only";
  copyPolicy: "link-only" | "metadata-only" | "embed-permitted";
  enabled: boolean;
  feedUrl?: string;
  contentType?: "article" | "podcast";
  matchTerms?: string[];
}

export interface CoverageItem {
  id: string;
  type: "article" | "podcast";
  title: string;
  publisher: string;
  publishedAt: string;
  url: string;
  description: string;
  sourceId: string;
  featured?: boolean;
}

export interface VaultSearchDocument {
  id: string;
  type: "player" | "legend" | "season" | "game" | "moment" | "championship" | "rivalry" | "collection" | "number" | "venue" | "era" | "timeline";
  title: string;
  subtitle: string;
  text: string;
  href: string;
  year?: number;
}
