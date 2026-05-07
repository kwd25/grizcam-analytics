import assert from "node:assert/strict";
import test from "node:test";
import type { AnalyticsEventUpsertRow } from "./portalTypes.js";
import { buildUpsertEventsQuery, UPSERT_EVENTS_COLUMN_COUNT } from "./upsertEvents.js";

const row = (overrides: Partial<AnalyticsEventUpsertRow> = {}): AnalyticsEventUpsertRow => ({
  id: "sample_row_1",
  organizationId: "org_demo_north",
  eventGroup: "event_group_1",
  mac: "F0F5BD77B104",
  cameraName: "North Ridge Camera",
  sequence: 1,
  sensor: "pir",
  fileType: "image/jpeg",
  filename: "event-1.jpg",
  utcTimestamp: "2025-01-01T14:15:30.000Z",
  localTimestamp: "2025-01-01T07:15:30.000Z",
  timezone: "America/Denver",
  tag: "wildlife",
  heatLevel: 42,
  location: "north ridge",
  latitude: 44.1,
  longitude: -110.2,
  temperature: 31.4,
  humidity: 52.1,
  pressure: 1012.4,
  bearing: 87,
  voltage: 4.82,
  batteryPercentage: 96.5,
  lux: 140,
  imageBlobUrl: "https://example.blob.core.windows.net/grizcam/sample.jpg",
  audioBlobUrl: null,
  videoBlobUrl: null,
  aiProcessed: true,
  jsonProcessed: true,
  created: "2025-01-01T14:16:02.000Z",
  jsonTimestamp: "2025-01-01T14:16:20.000Z",
  analysisTitle: "Elk crossing",
  analysisSummary: "An elk crossed the frame.",
  subjectCategory: "wildlife",
  subjectClass: "elk",
  keywords: { Animals: ["elk"] },
  details: { main_subject: "elk" },
  aiDescription: { title: "Elk crossing" },
  rawEvent: { id: "sample_row_1" },
  rawAnalysis: { title: "Elk crossing" },
  updatedAt: "2026-01-02T03:04:05.000Z",
  ...overrides
});

test("buildUpsertEventsQuery uses parameter placeholders", () => {
  const query = buildUpsertEventsQuery([row()]);

  assert.match(query.text, /\$1/);
  assert.match(query.text, new RegExp(`\\$${UPSERT_EVENTS_COLUMN_COUNT}`));
});

test("includes organization_id column", () => {
  const query = buildUpsertEventsQuery([row()]);

  assert.match(query.text, /"organization_id"/);
});

test("does not interpolate row values into SQL", () => {
  const malicious = "sample'); drop table events; --";
  const query = buildUpsertEventsQuery([row({ id: malicious, mac: malicious })]);

  assert.equal(query.text.includes(malicious), false);
  assert.ok(query.values.includes(malicious));
});

test("empty rows throw a clear error", () => {
  assert.throws(() => buildUpsertEventsQuery([]), /requires at least one row/);
});

test("uses ON CONFLICT (id) DO UPDATE", () => {
  const query = buildUpsertEventsQuery([row()]);

  assert.match(query.text, /on conflict \(id\) do update set/i);
});

test("values length matches expected columns times rows", () => {
  const query = buildUpsertEventsQuery([row(), row({ id: "sample_row_2" })]);

  assert.equal(query.values.length, UPSERT_EVENTS_COLUMN_COUNT * 2);
});
