# Raiders Vault

Raiders Vault is an independent, source-backed digital archive of Raiders franchise history. It is built as a knowledge engine first and a website second: people, seasons, games, moments, eras, venues and sources are structured records that can connect to each other automatically.

## What is live now

- Museum-style homepage and franchise timeline
- Seed season, player and historic-moment archives
- Working Vault Search across structured records
- “Today in Raiders History” / next-date module
- Live current-coverage aggregation from approved RSS podcast/news sources
- Trust scoring, relevance filtering, title/URL deduplication and freshness ranking
- Metadata-only/link-out posture for outside journalism
- Six-hour GitHub Actions snapshot refresh with graceful fallback
- `/api/coverage` cached JSON endpoint
- `/api/health` health endpoint
- Normalized PostgreSQL schema ready for a dedicated database
- Render auto-deployment from `main`

## Current source strategy

The live aggregator is intentionally conservative. The registry lives in `data/source-registry.json`. Sources can be enabled/disabled without changing page code. RSS failures are isolated; one broken source cannot break the site.

The site stores and displays titles, publisher/source metadata, dates, canonical links and Raiders Vault’s own short routing copy. It does not republish article bodies. Podcast items link to the original show/source.

## Data architecture

Current zero-cost production storage is versioned JSON plus server-side feed refresh. The future Postgres model is in `db/schema.sql` and includes:

- `sources`
- `entities`
- `facts` with source provenance and confidence
- `relations`
- `external_items`
- `ingestion_runs`

This lets Raiders Vault migrate to a dedicated database later without changing its editorial model.

## Automation

`.github/workflows/refresh-coverage.yml` runs every six hours and can also be triggered manually. It refreshes `data/generated/coverage.json` only when live feed data is available. Render auto-deploys when that snapshot changes.

The Next.js server also refreshes approved RSS feeds with a 30-minute revalidation window, so the site can show newer items between snapshot commits.

## Editorial / legal posture

Raiders Vault is an independent fan archive and is not affiliated with, endorsed by, or sponsored by the Las Vegas Raiders or NFL.

External journalism and podcast content should be handled using approved RSS feeds, APIs, publisher metadata, or official embeds. The site should link users to the original publisher, avoid republishing substantial article text, and only display imagery when the source/license explicitly permits it.

## Local development

```bash
npm install
npm run dev
```

To refresh the current-coverage snapshot:

```bash
npm run refresh:coverage
```

## Render

Render deploys Next.js as a Node web service with `npm install && npm run build` and `npm start`.
