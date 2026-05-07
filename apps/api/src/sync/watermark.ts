export const buildGetWatermarkQuery = (sourceName: string) => ({
  text: `select source_name, last_value, last_synced_at, metadata
from sync_watermarks
where source_name = $1`,
  values: [sourceName]
});

export const buildUpsertWatermarkQuery = (sourceName: string, lastValue: string | null, metadata: Record<string, unknown> = {}) => ({
  text: `insert into sync_watermarks (source_name, last_value, last_synced_at, metadata)
values ($1, $2, now(), $3::jsonb)
on conflict (source_name) do update set
  last_value = excluded.last_value,
  last_synced_at = excluded.last_synced_at,
  metadata = excluded.metadata`,
  values: [sourceName, lastValue, metadata]
});
