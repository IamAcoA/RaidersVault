import type { CoverageItem } from "@/lib/types";

// Prototype seed data only. The production ingestion worker will replace this file
// with metadata gathered from approved feeds/APIs/embeds and ranked automatically.
export const coverage: CoverageItem[] = [
  {
    id: "official-super-bowl-xi-reunion",
    type: "article",
    title: "Fifty years later, the memories remain: Raiders champions reunite to revisit Super Bowl XI",
    publisher: "Raiders.com",
    publishedAt: "2026-09-05",
    url: "https://www.raiders.com/news/",
    description: "Official team coverage revisiting the franchise's first Super Bowl championship season.",
    sourceId: "raiders-official",
    featured: true
  },
  {
    id: "official-raiders-weekly",
    type: "podcast",
    title: "Raiders Weekly / Raiders Podcast Network",
    publisher: "Raiders Podcast Network",
    publishedAt: "2026-09-05",
    url: "https://www.raiders.com/audio/",
    description: "Official audio hub with current Raiders podcasts, interviews and weekly shows.",
    sourceId: "raiders-official",
    featured: true
  }
];
