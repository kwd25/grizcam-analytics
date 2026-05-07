alter table events
  add column if not exists audio_blob_url text,
  add column if not exists video_blob_url text,
  add column if not exists raw_event jsonb,
  add column if not exists raw_analysis jsonb,
  add column if not exists updated_at timestamptz not null default now();

create table if not exists sync_watermarks (
  source_name text primary key,
  last_value text,
  last_synced_at timestamptz not null default now(),
  metadata jsonb not null default '{}'::jsonb
);
