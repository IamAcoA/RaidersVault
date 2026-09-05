# Raiders Vault

Raiders Vault is an independent, source-backed digital archive of Raiders franchise history. The product is designed as a knowledge engine first and a website second: people, seasons, games, moments, eras, venues and sources are structured records that can connect to each other automatically.

## Current capabilities

- Museum-style homepage
- Franchise timeline
- Complete season backbone from 1960 through the current franchise season
- Seed player archive
- Historic moments collection
- Database-backed Vault search with versioned fallback
- "Around Raider Nation" external coverage module
- Source registry with trust and copy-policy fields
- Coverage ranking and deduplication
- Render Postgres schema with source provenance
- Versioned, serialized database migrations
- Scheduled coverage snapshot refresh

## Editorial / legal posture

Raiders Vault is an independent fan archive and is not affiliated with, endorsed by, or sponsored by the Las Vegas Raiders or NFL.

External journalism and podcast content should be handled using approved RSS feeds, APIs, publisher metadata, or official embeds. The site should link users to the original publisher, avoid republishing substantial article text, and only display imagery when the source/license explicitly permits it.

## Data model

The Postgres layer currently models trusted sources, entities, facts, relations, external items, ingestion runs, and database migration metadata. Historical facts retain source URLs and confidence values so the archive can expand without turning into an unsourced content farm.

## Local development

```bash
npm install
npm run dev
```

Open http://localhost:3000.

## Render

The production site deploys as a Node web service on Render. `DATABASE_URL` is provided by Render and is never committed to GitHub. The app automatically applies versioned database migrations when the expected schema version changes.
