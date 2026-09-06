import { databaseConfigured, db, ensureDatabaseReady } from "@/lib/db";
import { vaultIndex } from "@/lib/vault-index";
import type { VaultSearchDocument } from "@/lib/types";

export async function getVaultDocuments(): Promise<{ documents: VaultSearchDocument[]; database: boolean }> {
  if (!databaseConfigured()) return { documents: vaultIndex, database: false };
  if (!(await ensureDatabaseReady())) return { documents: vaultIndex, database: false };

  try {
    const sql = db();
    const rows = await sql<Array<{
      entity_type: string;
      slug: string;
      display_name: string;
      start_date: string | null;
      metadata: Record<string, unknown>;
    }>>`
      select entity_type, slug, display_name, start_date, metadata
      from entities
      where entity_type in ('person','player','coach','executive','season','moment','era','championship','event')
      order by coalesce(start_date, '9999-12-31'::date), display_name
    `;

    if (!rows.length) return { documents: vaultIndex, database: true };

    const documents: VaultSearchDocument[] = rows.map((row) => {
      const metadata = row.metadata ?? {};
      const year = row.start_date ? Number(String(row.start_date).slice(0, 4)) : undefined;
      const isLegend = metadata.collection === "Pro Football Hall of Fame";
      const subtitle = String(metadata.subtitle ?? metadata.years ?? metadata.record ?? metadata.date ?? metadata.collection ?? row.entity_type);
      const text = [row.display_name, row.slug, row.entity_type, ...Object.values(metadata).map(String)].join(" ");

      let type: VaultSearchDocument["type"] = "timeline";
      let href = "/timeline";
      if (row.entity_type === "championship") {
        type = "championship";
        href = `/championships/${row.slug}`;
      } else if (isLegend) {
        type = "legend";
        href = `/legends/${row.slug}`;
      } else if (row.entity_type === "player") {
        type = "player";
        href = "/players";
      } else if (row.entity_type === "season") {
        type = "season";
        href = "/seasons";
      } else if (row.entity_type === "moment") {
        type = "moment";
        href = "/moments";
      }

      return {
        id: `db:${row.entity_type}:${row.slug}`,
        type,
        title: row.display_name,
        subtitle,
        text,
        href,
        year
      };
    });

    return { documents, database: true };
  } catch {
    return { documents: vaultIndex, database: false };
  }
}
