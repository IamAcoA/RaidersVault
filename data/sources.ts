import type { SourceRecord } from "@/lib/types";

export const sources: SourceRecord[] = [
  { id: "raiders-official", name: "Raiders.com", homepage: "https://www.raiders.com/", type: "official", trust: 5, ingestion: "metadata-only", copyPolicy: "link-only", enabled: true },
  { id: "pro-football-hof", name: "Pro Football Hall of Fame", homepage: "https://www.profootballhof.com/teams/las-vegas-raiders", type: "reference", trust: 5, ingestion: "manual", copyPolicy: "metadata-only", enabled: true },
  { id: "apple-podcasts", name: "Apple Podcasts", homepage: "https://podcasts.apple.com/", type: "podcast", trust: 4, ingestion: "embed", copyPolicy: "embed-permitted", enabled: true }
];
