import assert from "node:assert/strict";
import test from "node:test";
import { buildGetWatermarkQuery, buildUpsertWatermarkQuery } from "./watermark.js";

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
