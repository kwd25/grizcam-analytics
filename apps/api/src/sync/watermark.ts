type WatermarkQueryResult = {
  rows: SyncWatermarkDbRow[];
};

type WatermarkQueryable = {
  query: (text: string, values?: unknown[]) => Promise<WatermarkQueryResult>;
};

type SyncWatermarkDbRow = {
  source_name: string;
  last_value: string | null;
  last_synced_at: Date | string | null;
  metadata: Record<string, unknown> | null;
};

export type SyncWatermark = {
  sourceName: string;
  lastValue: string | null;
  lastSyncedAt: string | null;
  metadata: Record<string, unknown>;
};

export type SyncWatermarkStatus =
  | {
      watermarkTable: "ok";
      watermarks: SyncWatermark[];
      latestWatermarkAt: string | null;
      database: { status: "ok" };
      error: null;
    }
  | {
      watermarkTable: "missing" | "unavailable";
      watermarks: SyncWatermark[];
      latestWatermarkAt: null;
      database: { status: "ok" | "unavailable"; message?: string };
      error: string | null;
    };

const isMissingRelationError = (error: unknown) => error instanceof Error && (error as { code?: unknown }).code === "42P01";

const toIsoString = (value: Date | string | null) => {
  if (value === null) {
    return null;
  }

  if (value instanceof Date) {
    return value.toISOString();
  }

  return value;
};

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

export const listSyncWatermarks = async (pool: WatermarkQueryable): Promise<SyncWatermark[]> => {
  const result = await pool.query(
    `select source_name, last_value, last_synced_at, metadata
from sync_watermarks
order by last_synced_at desc, source_name asc
limit 25`
  );

  return result.rows.map((row) => ({
    sourceName: row.source_name,
    lastValue: row.last_value,
    lastSyncedAt: toIsoString(row.last_synced_at),
    metadata: row.metadata ?? {}
  }));
};

export const getSyncWatermarkStatus = async (pool: WatermarkQueryable): Promise<SyncWatermarkStatus> => {
  try {
    const watermarks = await listSyncWatermarks(pool);

    return {
      watermarkTable: "ok",
      watermarks,
      latestWatermarkAt: watermarks[0]?.lastSyncedAt ?? null,
      database: { status: "ok" },
      error: null
    };
  } catch (error) {
    if (isMissingRelationError(error)) {
      return {
        watermarkTable: "missing",
        watermarks: [],
        latestWatermarkAt: null,
        database: { status: "ok" },
        error: null
      };
    }

    return {
      watermarkTable: "unavailable",
      watermarks: [],
      latestWatermarkAt: null,
      database: {
        status: "unavailable",
        message: "Database query failed while reading sync watermarks."
      },
      error: "Sync watermark status is unavailable."
    };
  }
};
