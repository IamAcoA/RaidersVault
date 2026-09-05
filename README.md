# Raiders Vault

Raiders Vault is an independent, source-backed digital archive of Raiders franchise history. The product is designed as a knowledge engine first and a website second: people, seasons, games, moments, eras, venues and sources are structured records that can connect to each other automatically.

## MVP included in this repository

- Museum-style homepage
- Franchise timeline
- Seed season archive
- Seed player archive
- Historic moments collection
- Vault/search architecture page
- "Around Raider Nation" external coverage module
- Source registry with trust and copy-policy fields
- Coverage ranking utility
- Render Blueprint (`render.yaml`)

## Editorial / legal posture

Raiders Vault is an independent fan archive and is not affiliated with, endorsed by, or sponsored by the Las Vegas Raiders or NFL.

External journalism and podcast content should be handled using approved RSS feeds, APIs, publisher metadata, or official embeds. The site should link users to the original publisher, avoid republishing substantial article text, and only display imagery when the source/license explicitly permits it.

## Production roadmap

1. Move seed records into PostgreSQL/Supabase.
2. Add normalized entities: Person, Player, Coach, Executive, Season, Game, Moment, Venue, Artifact, Source, ExternalItem.
3. Add source provenance to every historical fact.
4. Add scheduled ingestion workers for approved current-content sources.
5. Add duplicate-story detection and automated ranking.
6. Add full-text + semantic Vault Search.
7. Expand seasons from 1960 through the current season.
8. Add admin actions: Approve, Correct, Feature, Hide.

## Local development

```bash
npm install
npm run dev
```

Open http://localhost:3000.

## Render

This repo includes a Render Blueprint. Render can deploy Next.js as a Node web service with `npm run build` and `npm start`.
