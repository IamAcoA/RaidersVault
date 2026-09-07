-- Raiders Vault normalized data model.

create extension if not exists pgcrypto;

create table if not exists app_meta (
  key text primary key,
  value text not null,
  updated_at timestamptz not null default now()
);

create table if not exists sources (
  id text primary key,
  name text not null,
  homepage text not null,
  source_type text not null check (source_type in ('official','news','podcast','reference')),
  trust smallint not null check (trust between 1 and 5),
  ingestion_method text not null,
  copy_policy text not null,
  metadata jsonb not null default '{}'::jsonb,
  enabled boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists entities (
  id uuid primary key default gen_random_uuid(),
  entity_type text not null check (entity_type in ('person','player','coach','executive','season','game','moment','venue','artifact','era','championship','rivalry','number','record','event')),
  slug text not null unique,
  display_name text not null,
  start_date date,
  end_date date,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists facts (
  id uuid primary key default gen_random_uuid(),
  entity_id uuid not null references entities(id) on delete cascade,
  fact_key text not null,
  fact_value jsonb not null,
  source_id text not null references sources(id),
  source_url text not null,
  confidence numeric(4,3) not null default 1.0 check (confidence between 0 and 1),
  verified_at timestamptz not null default now(),
  unique(entity_id, fact_key, source_url)
);

create table if not exists relations (
  id uuid primary key default gen_random_uuid(),
  from_entity_id uuid not null references entities(id) on delete cascade,
  relation_type text not null,
  to_entity_id uuid not null references entities(id) on delete cascade,
  source_id text references sources(id),
  source_url text,
  unique(from_entity_id, relation_type, to_entity_id)
);

create table if not exists external_items (
  id uuid primary key default gen_random_uuid(),
  source_id text not null references sources(id),
  external_key text not null,
  item_type text not null check (item_type in ('article','podcast','video')),
  title text not null,
  canonical_url text not null,
  publisher text not null,
  published_at timestamptz,
  metadata jsonb not null default '{}'::jsonb,
  discovered_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  hidden boolean not null default false,
  featured boolean not null default false,
  unique(source_id, external_key)
);

create index if not exists external_items_published_idx on external_items (published_at desc);
create index if not exists entities_type_idx on entities (entity_type);
create index if not exists entities_search_idx on entities using gin (to_tsvector('english', display_name || ' ' || metadata::text));

create table if not exists ingestion_runs (
  id uuid primary key default gen_random_uuid(),
  source_id text references sources(id),
  started_at timestamptz not null default now(),
  finished_at timestamptz,
  status text not null check (status in ('running','success','partial','failed')),
  items_seen integer not null default 0,
  items_written integer not null default 0,
  error_message text
);
