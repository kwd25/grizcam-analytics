import assert from "node:assert/strict";
import test from "node:test";
import { buildGetWatermarkQuery, buildUpsertWatermarkQuery, getSyncWatermarkStatus, listSyncWatermarks } from "./watermark.js";

test("get watermark query parameterizes sourceName", () => {
  const sourceName = "portal_events'; drop table sync_watermarks; --";
  const query = buildGetWatermarkQuery(sourceName);

  assert.match(query.text, /where source_name = \$1/);
  assert.equal(query.text.includes(sourceName), false);
  assert.deepEqual(query.values, [sourceName]);
});

test("upsert watermark query parameterizes sourceName, lastValue, and metadata", () => {
  const sourceName = "portal_events";
  const lastValue = "2025-01-01T00:00:00Z";
  const metadata = { count: 10 };
  const query = buildUpsertWatermarkQuery(sourceName, lastValue, metadata);

  assert.match(query.text, /values \(\$1, \$2, now\(\), \$3::jsonb\)/);
  assert.deepEqual(query.values, [sourceName, lastValue, metadata]);
});

test("upsert watermark query does not interpolate values", () => {
  const sourceName = "portal_events'; drop table events; --";
  const query = buildUpsertWatermarkQuery(sourceName, "abc", { sourceName });

  assert.equal(query.text.includes(sourceName), false);
  assert.ok(query.values.includes(sourceName));
});

test("list sync watermarks maps database rows to safe response rows", async () => {
  const pool = {
    query: async () => ({
      rows: [
        {
          source_name: "portal_events",
          last_value: "2026-01-01T00:00:00Z",
          last_synced_at: new Date("2026-01-01T00:01:00Z"),
          metadata: { count: 2 }
        }
      ]
    })
  };

  assert.deepEqual(await listSyncWatermarks(pool), [
    {
      sourceName: "portal_events",
      lastValue: "2026-01-01T00:00:00Z",
      lastSyncedAt: "2026-01-01T00:01:00.000Z",
      metadata: { count: 2 }
    }
  ]);
});

test("sync watermark status reports missing table for 42P01", async () => {
  const error = new Error('relation "sync_watermarks" does not exist') as Error & { code: string };
  error.code = "42P01";
  const pool = {
    query: async () => {
      throw error;
    }
  };

  assert.deepEqual(await getSyncWatermarkStatus(pool), {
    watermarkTable: "missing",
    watermarks: [],
    latestWatermarkAt: null,
    database: { status: "ok" },
    error: null
  });
});

test("sync watermark status reports unavailable for other database failures", async () => {
  const pool = {
    query: async () => {
      throw new Error("connection refused");
    }
  };

  assert.deepEqual(await getSyncWatermarkStatus(pool), {
    watermarkTable: "unavailable",
    watermarks: [],
    latestWatermarkAt: null,
    database: {
      status: "unavailable",
      message: "Database query failed while reading sync watermarks."
    },
    error: "Sync watermark status is unavailable."
  });
});
