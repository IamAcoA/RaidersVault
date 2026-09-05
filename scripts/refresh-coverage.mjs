import fs from "node:fs/promises";
import path from "node:path";
import { XMLParser } from "fast-xml-parser";

const root = process.cwd();
const registry = JSON.parse(await fs.readFile(path.join(root, "data/source-registry.json"), "utf8"));
const parser = new XMLParser({ ignoreAttributes: false, attributeNamePrefix: "@_", trimValues: true });

const asArray = value => value == null ? [] : Array.isArray(value) ? value : [value];
const text = value => {
  if (typeof value === "string" || typeof value === "number") return String(value);
  if (value && typeof value === "object") return text(value["#text"] ?? value["@_href"] ?? "");
  return "";
};
const linkFrom = item => {
  const direct = text(item.link);
  if (direct.startsWith("http")) return direct;
  for (const link of asArray(item.link)) {
    const href = text(link?.["@_href"]);
    if (href.startsWith("http")) return href;
  }
  return text(item.guid);
};
const idFor = (sourceId, title, url) => {
  let hash = 2166136261;
  for (const char of `${sourceId}|${title}|${url}`) {
    hash ^= char.charCodeAt(0);
    hash = Math.imul(hash, 16777619);
  }
  return `${sourceId}-${(hash >>> 0).toString(36)}`;
};
const relevant = (source, title) => !source.matchTerms?.length || source.matchTerms.some(term => title.toLowerCase().includes(term.toLowerCase()));

const all = [];
for (const source of registry.filter(source => source.enabled && source.ingestion === "rss" && source.feedUrl)) {
  try {
    const response = await fetch(source.feedUrl, { headers: { "user-agent": "RaidersVault/0.2 (+https://raiders-vault.onrender.com)" }, signal: AbortSignal.timeout(10000) });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const parsed = parser.parse(await response.text());
    const items = [...asArray(parsed?.rss?.channel?.item), ...asArray(parsed?.feed?.entry)];
    for (const item of items.slice(0, 30)) {
      const title = text(item.title).replace(/\s+/g, " ").trim();
      const url = linkFrom(item);
      if (!title || !url || !relevant(source, title)) continue;
      const rawDate = text(item.pubDate ?? item.published ?? item.updated ?? item["dc:date"]);
      const publishedAt = Number.isNaN(Date.parse(rawDate)) ? new Date().toISOString() : new Date(rawDate).toISOString();
      all.push({
        id: idFor(source.id, title, url),
        type: source.contentType,
        title,
        publisher: source.name,
        publishedAt,
        url,
        description: source.contentType === "podcast" ? `Latest episode from ${source.name}. Listen at the original source.` : `Current Raiders coverage from ${source.name}. Read the full story at the original publisher.`,
        sourceId: source.id
      });
    }
    console.log(`ok ${source.id}: ${items.length} feed items`);
  } catch (error) {
    console.warn(`skip ${source.id}: ${error.message}`);
  }
}

const seen = new Set();
const deduped = all
  .filter(item => {
    const key = item.title.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  })
  .sort((a, b) => Date.parse(b.publishedAt) - Date.parse(a.publishedAt))
  .slice(0, 60);

if (!deduped.length) {
  console.warn("No live items retrieved; preserving existing snapshot.");
  process.exit(0);
}

await fs.writeFile(path.join(root, "data/generated/coverage.json"), `${JSON.stringify(deduped, null, 2)}\n`);
console.log(`wrote ${deduped.length} items`);
