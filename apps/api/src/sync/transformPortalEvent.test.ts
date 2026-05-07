import assert from "node:assert/strict";
import test from "node:test";
import type { PortalEventRecord } from "./portalTypes.js";
import { transformPortalEvent } from "./transformPortalEvent.js";

const now = () => new Date("2026-01-02T03:04:05.000Z");

const baseEvent = (overrides: PortalEventRecord = {}): PortalEventRecord => ({
  id: "portal_event_1",
  organizationId: "org_demo_north",
  name: "North Ridge Camera",
  mac: "F0F5BD77B104",
  event: "event_group_1",
  sequence: "2",
  sensor: "pir",
  utc_timestamp: "2025-01-01T14:15:30Z",
  timestamp: "2025-01-01T07:15:30Z",
  timezone: "America/Denver",
  fileType: "image/jpeg",
  filename: "event-1.jpg",
  heatLevel: "43",
  latitude: "44.1",
  longitude: "-110.2",
  temperature: "31.5",
  humidity: "53.2",
  pressure: "1012.4",
  bearing: "181",
  voltage: "4.82",
  batteryPercentage: "96.5",
  lux: "120",
  ai_processed: "true",
  json_processed: "false",
  event_analysis: {
    title: "Elk crossing",
    summary: "An elk crossed the frame.",
    keywords: {
      Animals: ["elk"],
      category: "wildlife"
    },
    details: {
      main_subject: "elk"
    }
  },
  ...overrides
});

const transformOk = (event: PortalEventRecord) => {
  const result = transformPortalEvent(event, { now });
  assert.equal(result.ok, true);
  return result.row;
};

test("maps organizationId, name, and mac to analytics row fields", () => {
  const row = transformOk(baseEvent());

  assert.equal(row.organizationId, "org_demo_north");
  assert.equal(row.cameraName, "North Ridge Camera");
  assert.equal(row.mac, "F0F5BD77B104");
});

test("normalizes timestamps as ISO strings", () => {
  const row = transformOk(baseEvent());

  assert.equal(row.utcTimestamp, "2025-01-01T14:15:30.000Z");
  assert.equal(row.localTimestamp, "2025-01-01T07:15:30.000Z");
});

test("coerces numeric fields", () => {
  const row = transformOk(baseEvent());

  assert.equal(row.sequence, 2);
  assert.equal(row.heatLevel, 43);
  assert.equal(row.latitude, 44.1);
  assert.equal(row.longitude, -110.2);
  assert.equal(row.temperature, 31.5);
  assert.equal(row.humidity, 53.2);
  assert.equal(row.pressure, 1012.4);
  assert.equal(row.bearing, 181);
  assert.equal(row.voltage, 4.82);
  assert.equal(row.batteryPercentage, 96.5);
  assert.equal(row.lux, 120);
});

test("coerces boolean fields", () => {
  const row = transformOk(baseEvent());

  assert.equal(row.aiProcessed, true);
  assert.equal(row.jsonProcessed, false);
});

test("extracts analysis title, summary, keywords, and details", () => {
  const row = transformOk(baseEvent());

  assert.equal(row.analysisTitle, "Elk crossing");
  assert.equal(row.analysisSummary, "An elk crossed the frame.");
  assert.deepEqual(row.keywords, {
    Animals: ["elk"],
    category: "wildlife"
  });
  assert.deepEqual(row.details, {
    main_subject: "elk"
  });
  assert.equal(row.subjectCategory, "wildlife");
  assert.equal(row.subjectClass, "elk");
});

test("preserves rawEvent and rawAnalysis", () => {
  const row = transformOk(baseEvent());

  assert.equal(row.rawEvent.id, "portal_event_1");
  assert.deepEqual(row.rawAnalysis, {
    title: "Elk crossing",
    summary: "An elk crossed the frame.",
    keywords: {
      Animals: ["elk"],
      category: "wildlife"
    },
    details: {
      main_subject: "elk"
    }
  });
});

test("missing mac returns ok:false", () => {
  const result = transformPortalEvent(baseEvent({ mac: null }), { now });

  assert.equal(result.ok, false);
  assert.equal(result.reason, "missing mac");
});

test("uses deterministic updatedAt with now option", () => {
  const row = transformOk(baseEvent());

  assert.equal(row.updatedAt, "2026-01-02T03:04:05.000Z");
});

test("messy numeric values become null with warnings", () => {
  const result = transformPortalEvent(baseEvent({ batteryPercentage: "full", sequence: "not-a-number" }), { now });

  assert.equal(result.ok, true);
  assert.equal(result.row.batteryPercentage, null);
  assert.equal(result.row.sequence, null);
  assert.ok(result.warnings.some((warning) => warning.includes("batteryPercentage")));
  assert.ok(result.warnings.some((warning) => warning.includes("sequence")));
});

test("derives deterministic fallback id from mac, utc_timestamp, and filename", () => {
  const row = transformOk(baseEvent({ id: undefined }));

  assert.match(row.id, /^portal_[a-f0-9]{24}$/);
});
