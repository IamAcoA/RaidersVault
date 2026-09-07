import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import postgres from "postgres";

const execFileAsync = promisify(execFile);
const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  console.log("[db:v10] DATABASE_URL not configured; skipping migration.");
  process.exit(0);
}

const VERSION = "10";
const LOCK_KEY = 724325210;
const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, "..");
const sql = postgres(databaseUrl, { max: 1, connect_timeout: 15, prepare: false });

function slugify(value) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

function milestoneSlug(item) {
  return `al-davis-${item.year}-${slugify(item.title)}`;
}

function targetSlug(href) {
  const season = href.match(/^\/seasons\/(\d{4})$/);
  if (season) return `season-${season[1]}`;
  const championship = href.match(/^\/championships\/([^/]+)$/);
  if (championship) return championship[1];
  const legend = href.match(/^\/legends\/([^/]+)$/);
  if (legend) return legend[1];
  const player = href.match(/^\/players\/([^/]+)$/);
  if (player) return player[1];
  return null;
}

async function schemaVersion() {
  const check = await sql`select to_regclass('public.app_meta')::text as app_meta`;
  if (!check[0]?.app_meta) return null;
  const rows = await sql`select value from app_meta where key = 'schema_version' limit 1`;
  return rows[0]?.value ? String(rows[0].value) : null;
}

async function ensureFoundation() {
  const version = await schemaVersion();
  if (version === VERSION || version === "9") return;
  console.log(`[db:v10] v9 foundation required from ${version ?? "none"}`);
  const { stdout, stderr } = await execFileAsync(process.execPath, ["scripts/migrate-v9-rivalries.mjs"], {
    cwd: root,
    env: process.env,
    timeout: 90000
  });
  if (stdout.trim()) console.log(stdout.trim());
  if (stderr.trim()) console.warn(stderr.trim());
}

async function run() {
  await ensureFoundation();
  let lockHeld = false;
  try {
    await sql`select pg_advisory_lock(${LOCK_KEY})`;
    lockHeld = true;
    if (await schemaVersion() === VERSION) {
      console.log(`[db:v10] schema version ${VERSION} already current; migration skipped`);
      return;
    }

    const collection = JSON.parse(await fs.readFile(path.join(root, "data/al-davis-collection.json"), "utf8"));
    await sql.begin(async tx => {
      const people = await tx`
        select id, metadata
        from entities
        where slug = 'al-davis'
        limit 1
      `;
      const person = people[0];
      if (!person?.id) throw new Error("Canonical Al Davis entity is missing");

      const mergedMetadata = {
        ...(person.metadata ?? {}),
        collectionHref: "/al-davis",
        collectionTitle: collection.title,
        collectionSubtitle: collection.subtitle,
        collectionLifespan: collection.lifespan,
        collectionSummary: collection.summary
      };
      await tx`
        update entities
        set metadata = ${tx.json(mergedMetadata)}, updated_at = now()
        where id = ${person.id}
      `;

      await tx`
        insert into facts (entity_id, fact_key, fact_value, source_id, source_url, confidence, verified_at)
        values (
          ${person.id},
          'al_davis_collection',
          ${tx.json({ title: collection.title, milestoneCount: collection.milestones.length, lifespan: collection.lifespan })},
          'raiders-official',
          ${collection.sourceUrl},
          1.0,
          now()
        )
        on conflict (entity_id, fact_key, source_url) do update set
          fact_value = excluded.fact_value,
          source_id = excluded.source_id,
          confidence = excluded.confidence,
          verified_at = now()
      `;

      for (const milestone of collection.milestones) {
        const slug = milestoneSlug(milestone);
        const rows = await tx`
          insert into entities (entity_type, slug, display_name, start_date, metadata)
          values (
            'event',
            ${slug},
            ${milestone.title},
            ${milestone.date},
            ${tx.json({
              collection: collection.title,
              collectionSlug: collection.slug,
              href: `/al-davis#${slug}`,
              year: milestone.year,
              summary: milestone.summary,
              sourceLabel: milestone.sourceLabel,
              sourceUrl: milestone.sourceUrl,
              links: milestone.links
            })}
          )
          on conflict (slug) do update set
            entity_type = 'event',
            display_name = excluded.display_name,
            start_date = excluded.start_date,
            metadata = excluded.metadata,
            updated_at = now()
          returning id
        `;
        const eventId = rows[0]?.id;
        if (!eventId) continue;

        await tx`
          insert into facts (entity_id, fact_key, fact_value, source_id, source_url, confidence, verified_at)
          values (${eventId}, 'summary', ${tx.json({ summary: milestone.summary })}, 'raiders-official', ${milestone.sourceUrl}, 1.0, now())
          on conflict (entity_id, fact_key, source_url) do update set
            fact_value = excluded.fact_value,
            source_id = excluded.source_id,
            confidence = excluded.confidence,
            verified_at = now()
        `;

        await tx`
          insert into relations (from_entity_id, relation_type, to_entity_id, source_id, source_url)
          values (${eventId}, 'al_davis_milestone', ${person.id}, 'raiders-official', ${milestone.sourceUrl})
          on conflict (from_entity_id, relation_type, to_entity_id) do nothing
        `;

        for (const link of milestone.links) {
          const slugTarget = targetSlug(link.href);
          if (!slugTarget) continue;
          const targets = await tx`
            select id
            from entities
            where slug = ${slugTarget}
            limit 1
          `;
          const target = targets[0];
          if (!target?.id) {
            console.warn(`[db:v10] unresolved collection link ${link.href}`);
            continue;
          }
          await tx`
            insert into relations (from_entity_id, relation_type, to_entity_id, source_id, source_url)
            values (${eventId}, 'al_davis_context', ${target.id}, 'raiders-official', ${milestone.sourceUrl})
            on conflict (from_entity_id, relation_type, to_entity_id) do nothing
          `;
        }
      }

      await tx`
        insert into app_meta (key, value, updated_at)
        values ('schema_version', ${VERSION}, now())
        on conflict (key) do update set value = excluded.value, updated_at = now()
      `;
    });

    const counts = await sql`
      select
        (select count(*)::int from entities) as entities,
        (select count(*)::int from entities where entity_type = 'event' and metadata ->> 'collectionSlug' = 'al-davis') as al_davis_milestones,
        (select count(*)::int from facts) as facts,
        (select count(*)::int from relations) as relations,
        (select count(*)::int from relations where relation_type = 'al_davis_milestone') as milestone_person_links,
        (select count(*)::int from relations where relation_type = 'al_davis_context') as milestone_context_links
    `;
    console.log('[db:v10] migration complete', counts[0]);
  } finally {
    if (lockHeld) {
      try { await sql`select pg_advisory_unlock(${LOCK_KEY})`; }
      catch (error) { console.warn('[db:v10] failed to release migration lock', error); }
    }
  }
}

try { await run(); }
finally { await sql.end({ timeout: 5 }); }
