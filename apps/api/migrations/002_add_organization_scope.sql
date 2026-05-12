alter table events
  add column if not exists organization_id text;

alter table dim_devices
  add column if not exists organization_id text;

alter table daily_camera_summary
  add column if not exists organization_id text;

create index if not exists idx_events_organization_id
  on events (organization_id);

create index if not exists idx_events_organization_mac
  on events (organization_id, mac);

create index if not exists idx_dim_devices_organization_id
  on dim_devices (organization_id);

create index if not exists idx_dim_devices_organization_mac
  on dim_devices (organization_id, mac);

create index if not exists idx_daily_camera_summary_organization_mac_date
  on daily_camera_summary (organization_id, mac, date);
