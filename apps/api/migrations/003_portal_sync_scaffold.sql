alter table events
  add column if not exists audio_blob_url text,
  add column if not exists video_blob_url text,
  add column if not exists raw_event jsonb,
  add column if not exists raw_analysis jsonb,
  add column if not exists updated_at timestamptz default now();

create index if not exists idx_events_updated_at
  on events (updated_at);

create table if not exists sync_watermarks (
  source_name text primary key,
  last_value text,
  last_synced_at timestamptz not null default now(),
  metadata jsonb not null default '{}'::jsonb
);

create index if not exists idx_sync_watermarks_last_synced_at
  on sync_watermarks (last_synced_at);
