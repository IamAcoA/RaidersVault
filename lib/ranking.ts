import type { CoverageItem, SourceRecord } from "@/lib/types";

export function rankCoverage(items: CoverageItem[], sources: SourceRecord[]): CoverageItem[] {
  const sourceMap = new Map(sources.map((source) => [source.id, source]));
  const now = Date.now();

  return [...items]
    .filter((item) => sourceMap.get(item.sourceId)?.enabled)
    .sort((a, b) => score(b) - score(a));

  function score(item: CoverageItem) {
    const source = sourceMap.get(item.sourceId);
    if (!source) return -1;
    const ageHours = Math.max(0, (now - new Date(item.publishedAt).getTime()) / 3_600_000);
    const freshness = Math.max(0, 72 - ageHours) / 12;
    return source.trust * 10 + freshness + (item.featured ? 5 : 0);
  }
}
