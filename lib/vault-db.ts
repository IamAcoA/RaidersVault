import { databaseConfigured, db, ensureDatabaseReady } from "@/lib/db";
import { vaultIndex } from "@/lib/vault-index";
import type { VaultSearchDocument } from "@/lib/types";

function yearFromDate(value: unknown): number | undefined {
  if (value instanceof Date) return value.getUTCFullYear();
  const match = String(value ?? "").match(/^(\d{4})/);
  return match ? Number(match[1]) : undefined;
}

export async function getVaultDocuments(): Promise<{ documents: VaultSearchDocument[]; database: boolean }> {
  if (!databaseConfigured()) return { documents: vaultIndex, database: false };
  if (!(await ensureDatabaseReady())) return { documents: vaultIndex, database: false };

  try {
    const sql = db();
    const rows = await sql<Array<{
      entity_type: string;
      slug: string;
      display_name: string;
      start_date: unknown;
      metadata: Record<string, unknown>;
    }>>`
      select entity_type, slug, display_name, start_date, metadata
      from entities
      where entity_type in ('person','player','coach','executive','season','game','moment','era','championship','rivalry','number','event')
      order by coalesce(start_date, '9999-12-31'::date), display_name
    `;

    if (!rows.length) return { documents: vaultIndex, database: true };

    const documents: VaultSearchDocument[] = rows.map((row) => {
      const metadata = row.metadata ?? {};
      const year = row.entity_type === "game" ? Number(metadata.season) : Number(metadata.year ?? yearFromDate(row.start_date));
      const normalizedYear = Number.isFinite(year) ? year : undefined;
      const isLegend = metadata.collection === "Pro Football Hall of Fame";
      const isAlDavisMilestone = row.entity_type === "event" && metadata.collectionSlug === "al-davis";
      const subtitle = String(metadata.subtitle ?? metadata.years ?? metadata.record ?? metadata.date ?? metadata.collection ?? row.entity_type);
      const text = [row.display_name, row.slug, row.entity_type, JSON.stringify(metadata)].join(" ");

      let type: VaultSearchDocument["type"] = "timeline";
      let href = "/timeline";
      if (row.entity_type === "championship") {
        type = "championship";
        href = `/championships/${row.slug}`;
      } else if (row.entity_type === "game") {
        type = "game";
        href = `/games/${row.slug}`;
      } else if (row.entity_type === "rivalry") {
        type = "rivalry";
        href = `/rivalries/${row.slug}`;
      } else if (row.entity_type === "number") {
        type = "number";
        href = `/numbers/${String(metadata.number ?? row.slug.replace(/^number-/, ""))}`;
      } else if (isAlDavisMilestone) {
        type = "collection";
        href = String(metadata.href ?? `/al-davis#${row.slug}`);
      } else if (isLegend) {
        type = "legend";
        href = `/legends/${row.slug}`;
      } else if (row.entity_type === "player") {
        type = "player";
        href = metadata.sourceUrl ? `/players/${row.slug}` : "/players";
      } else if (row.entity_type === "season") {
        type = "season";
        href = `/seasons/${normalizedYear}`;
      } else if (row.entity_type === "moment") {
        type = "moment";
        href = `/moments/${row.slug}`;
      }

      return { id: `db:${row.entity_type}:${row.slug}`, type, title: row.display_name, subtitle, text, href, year: normalizedYear };
    });

    const alDavis = rows.find(row => row.slug === "al-davis" && row.metadata?.collectionHref);
    if (alDavis) {
      const metadata = alDavis.metadata ?? {};
      documents.push({
        id: "db:collection:al-davis",
        type: "collection",
        title: String(metadata.collectionTitle ?? "The Al Davis Collection"),
        subtitle: String(metadata.collectionSubtitle ?? "Raiders leadership history"),
        text: `Al Davis Collection Raiders ${String(metadata.collectionLifespan ?? "1929–2011")} ${String(metadata.collectionSummary ?? "")}`,
        href: String(metadata.collectionHref ?? "/al-davis"),
        year: 1963
      });
    }

    return { documents, database: true };
  } catch {
    return { documents: vaultIndex, database: false };
  }
}
