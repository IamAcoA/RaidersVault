import { XMLParser } from "fast-xml-parser";
import { coverage as snapshotCoverage } from "@/data/coverage";
import { sources } from "@/data/sources";
import { rankCoverage } from "@/lib/ranking";
import type { CoverageItem, SourceRecord } from "@/lib/types";
import { persistCoverage, storedCoverage } from "@/lib/coverage-db";

const parser = new XMLParser({ ignoreAttributes: false, attributeNamePrefix: "@_", trimValues: true });

function asArray<T>(value: T | T[] | undefined): T[] {
  if (value === undefined || value === null) return [];
  return Array.isArray(value) ? value : [value];
}

function text(value: unknown): string {
  if (typeof value === "string" || typeof value === "number") return String(value);
  if (value && typeof value === "object") {
    const record = value as Record<string, unknown>;
    return text(record["#text"] ?? record["@_href"] ?? "");
  }
  return "";
}

function linkFrom(item: Record<string, unknown>): string {
  const direct = text(item.link);
  if (direct.startsWith("http")) return direct;
  const links = asArray(item.link as Record<string, unknown> | Record<string, unknown>[] | undefined);
  for (const link of links) {
    const href = text(link?.["@_href"]);
    if (href.startsWith("http")) return href;
  }
  return text(item.guid);
}

function cleanTitle(raw: string): string {
  return raw.replace(/\s+/g, " ").trim();
}

function normalizeTitle(raw: string): string {
  return raw.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

function isRelevant(source: SourceRecord, title: string): boolean {
  if (!source.matchTerms?.length) return true;
  const haystack = title.toLowerCase();
  return source.matchTerms.some(term => haystack.includes(term.toLowerCase()));
}

function stableId(sourceId: string, title: string, url: string): string {
  const input = `${sourceId}|${title}|${url}`;
  let hash = 2166136261;
  for (let i = 0; i < input.length; i++) {
    hash ^= input.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return `${sourceId}-${(hash >>> 0).toString(36)}`;
}

async function fetchSource(source: SourceRecord): Promise<CoverageItem[]> {
  if (!source.enabled || source.ingestion !== "rss" || !source.feedUrl || !source.contentType) return [];

  try {
    const response = await fetch(source.feedUrl, {
      headers: { "user-agent": "RaidersVault/0.3 (+https://raiders-vault.onrender.com)" },
      next: { revalidate: 1800 },
      signal: AbortSignal.timeout(8000)
    });
    if (!response.ok) return [];

    const xml = await response.text();
    const parsed = parser.parse(xml) as Record<string, any>;
    const rssItems = asArray(parsed?.rss?.channel?.item);
    const atomItems = asArray(parsed?.feed?.entry);
    const items = [...rssItems, ...atomItems] as Record<string, unknown>[];

    return items.slice(0, 30).flatMap((item): CoverageItem[] => {
      const title = cleanTitle(text(item.title));
      const url = linkFrom(item);
      const publishedAt = text(item.pubDate ?? item.published ?? item.updated ?? item["dc:date"]);
      if (!title || !url || !isRelevant(source, title)) return [];

      const safeDate = Number.isNaN(Date.parse(publishedAt)) ? new Date().toISOString() : new Date(publishedAt).toISOString();
      return [{
        id: stableId(source.id, title, url),
        type: source.contentType!,
        title,
        publisher: source.name,
        publishedAt: safeDate,
        url,
        description: source.contentType === "podcast"
          ? `Latest episode from ${source.name}. Listen at the original source.`
          : `Current Raiders coverage from ${source.name}. Read the full story at the original publisher.`,
        sourceId: source.id
      }];
    });
  } catch {
    return [];
  }
}

export async function getLiveCoverage(limit = 12): Promise<CoverageItem[]> {
  const feedSources = sources.filter(source => source.enabled && source.ingestion === "rss");
  const batches = await Promise.all(feedSources.map(fetchSource));
  const live = batches.flat();
  if (live.length) await persistCoverage(live);
  const stored = await storedCoverage(40);
  const combined = live.length ? [...live, ...stored, ...snapshotCoverage] : stored.length ? [...stored, ...snapshotCoverage] : snapshotCoverage;

  const seenTitles = new Set<string>();
  const seenUrls = new Set<string>();
  const deduped = combined.filter(item => {
    const titleKey = normalizeTitle(item.title);
    if (!titleKey || seenTitles.has(titleKey) || seenUrls.has(item.url)) return false;
    seenTitles.add(titleKey);
    seenUrls.add(item.url);
    return true;
  });

  return rankCoverage(deduped, sources).slice(0, limit);
}
