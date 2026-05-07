import { createHash } from "node:crypto";
import type {
  AnalyticsEventUpsertRow,
  PortalEventRecord,
  TransformPortalEventOptions,
  TransformPortalEventResult
} from "./portalTypes.js";

const trimString = (value: unknown) => (typeof value === "string" && value.trim() ? value.trim() : null);

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const jsonSafe = (value: unknown): unknown => JSON.parse(JSON.stringify(value ?? null));

const toSafeRecord = (value: unknown): Record<string, unknown> =>
  isRecord(value) ? (jsonSafe(value) as Record<string, unknown>) : {};

const parseJsonObject = (value: unknown): Record<string, unknown> | null => {
  if (isRecord(value)) {
    return jsonSafe(value) as Record<string, unknown>;
  }

  if (typeof value !== "string" || !value.trim()) {
    return null;
  }

  try {
    const parsed = JSON.parse(value);
    return isRecord(parsed) ? (jsonSafe(parsed) as Record<string, unknown>) : null;
  } catch {
    return null;
  }
};

const toNumber = (value: unknown, field: string, warnings: string[]) => {
  if (value === undefined || value === null || value === "") {
    return null;
  }

  const parsed = typeof value === "number" ? value : Number(value);

  if (!Number.isFinite(parsed)) {
    warnings.push(`${field} could not be parsed as a number`);
    return null;
  }

  return parsed;
};

const toBoolean = (value: unknown, field: string, warnings: string[]) => {
  if (value === undefined || value === null || value === "") {
    return null;
  }

  if (typeof value === "boolean") {
    return value;
  }

  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase();
    if (["true", "1", "yes", "y"].includes(normalized)) {
      return true;
    }
    if (["false", "0", "no", "n"].includes(normalized)) {
      return false;
    }
  }

  warnings.push(`${field} could not be parsed as a boolean`);
  return null;
};

const toIsoTimestamp = (value: unknown, field: string, warnings: string[]) => {
  const trimmed = trimString(value);
  if (!trimmed) {
    return null;
  }

  const parsed = new Date(trimmed);
  if (Number.isNaN(parsed.getTime())) {
    warnings.push(`${field} could not be parsed as a timestamp`);
    return null;
  }

  return parsed.toISOString();
};

const getNestedString = (record: Record<string, unknown> | null, keys: string[]) => {
  if (!record) {
    return null;
  }

  for (const key of keys) {
    const value = record[key];
    if (typeof value === "string" && value.trim()) {
      return value.trim();
    }
  }

  return null;
};

const getNestedRecord = (record: Record<string, unknown> | null, key: string) => {
  const value = record?.[key];
  return isRecord(value) ? (jsonSafe(value) as Record<string, unknown>) : null;
};

const firstKeywordValue = (keywords: Record<string, unknown> | null, keys: string[]) => {
  if (!keywords) {
    return null;
  }

  for (const key of keys) {
    const value = keywords[key] ?? keywords[key.toLowerCase()];
    if (typeof value === "string" && value.trim()) {
      return value.trim();
    }
    if (Array.isArray(value)) {
      const firstString = value.find((entry) => typeof entry === "string" && entry.trim());
      if (typeof firstString === "string") {
        return firstString.trim();
      }
    }
  }

  return null;
};

const deriveSubjectCategory = (analysis: Record<string, unknown> | null, keywords: Record<string, unknown> | null) => {
  const explicit = getNestedString(analysis, ["subject_category", "subjectCategory", "category"]);
  if (explicit) {
    return explicit.toLowerCase();
  }

  const signal = firstKeywordValue(keywords, ["category", "Subject Category", "subject_category"]);
  if (signal) {
    return signal.toLowerCase();
  }

  const joined = JSON.stringify({ analysis, keywords }).toLowerCase();
  if (joined.includes("person") || joined.includes("human") || joined.includes("people")) {
    return "human";
  }
  if (joined.includes("vehicle") || joined.includes("truck") || joined.includes("car")) {
    return "vehicle";
  }
  if (joined.includes("animal") || joined.includes("wildlife") || joined.includes("bear") || joined.includes("elk")) {
    return "wildlife";
  }

  return null;
};

const deriveSubjectClass = (analysis: Record<string, unknown> | null, keywords: Record<string, unknown> | null) =>
  getNestedString(analysis, ["subject_class", "subjectClass", "main_subject", "subject"]) ??
  firstKeywordValue(keywords, ["Animals", "People", "Vehicles", "subject_class", "class"]);

const buildFallbackId = (record: PortalEventRecord) => {
  const mac = trimString(record.mac);
  const timestamp = trimString(record.utc_timestamp);
  const filename = trimString(record.filename);

  if (!mac || !timestamp || !filename) {
    return null;
  }

  const digest = createHash("sha256").update(`${mac}|${timestamp}|${filename}`).digest("hex").slice(0, 24);
  return `portal_${digest}`;
};

export const transformPortalEvent = (
  record: PortalEventRecord,
  options: TransformPortalEventOptions = {}
): TransformPortalEventResult => {
  const warnings: string[] = [];
  const rawEvent = toSafeRecord(record);
  const id = trimString(record.id) ?? buildFallbackId(record);
  const mac = trimString(record.mac);

  if (!id) {
    return {
      ok: false,
      reason: "missing id and insufficient fallback fields",
      warnings
    };
  }

  if (!mac) {
    return {
      ok: false,
      reason: "missing mac",
      warnings
    };
  }

  if (!record.id) {
    warnings.push("id derived from mac, utc_timestamp, and filename");
  }

  const aiDescriptionObject = parseJsonObject(record.ai_description);
  const aiDescription =
    aiDescriptionObject ?? (typeof record.ai_description === "string" && record.ai_description.trim() ? record.ai_description.trim() : null);
  const rawAnalysis = parseJsonObject(record.event_analysis);
  const primaryAnalysis = rawAnalysis ?? aiDescriptionObject;
  const keywords = getNestedRecord(primaryAnalysis, "keywords") ?? getNestedRecord(aiDescriptionObject, "keywords");
  const details = getNestedRecord(primaryAnalysis, "details") ?? getNestedRecord(aiDescriptionObject, "details");
  const eventGroup = trimString(record.event) ?? id;
  const updatedAt = (options.now ?? (() => new Date()))().toISOString();

  return {
    ok: true,
    row: {
      id,
      organizationId: trimString(record.organizationId) ?? trimString(record.organization_id),
      eventGroup,
      mac,
      cameraName: trimString(record.name),
      sequence: toNumber(record.sequence, "sequence", warnings),
      sensor: trimString(record.sensor),
      fileType: trimString(record.fileType),
      filename: trimString(record.filename),
      utcTimestamp: toIsoTimestamp(record.utc_timestamp, "utc_timestamp", warnings),
      localTimestamp: toIsoTimestamp(record.timestamp, "timestamp", warnings),
      timezone: trimString(record.timezone),
      tag: trimString(record.tag),
      heatLevel: toNumber(record.heatLevel, "heatLevel", warnings),
      location: trimString(record.location),
      latitude: toNumber(record.latitude, "latitude", warnings),
      longitude: toNumber(record.longitude, "longitude", warnings),
      temperature: toNumber(record.temperature, "temperature", warnings),
      humidity: toNumber(record.humidity, "humidity", warnings),
      pressure: toNumber(record.pressure, "pressure", warnings),
      bearing: toNumber(record.bearing, "bearing", warnings),
      voltage: toNumber(record.voltage, "voltage", warnings),
      batteryPercentage: toNumber(record.batteryPercentage, "batteryPercentage", warnings),
      lux: toNumber(record.lux, "lux", warnings),
      imageBlobUrl: trimString(record.image_blob_url),
      audioBlobUrl: trimString(record.audio_blob_url),
      videoBlobUrl: trimString(record.video_blob_url),
      aiProcessed: toBoolean(record.ai_processed, "ai_processed", warnings),
      jsonProcessed: toBoolean(record.json_processed, "json_processed", warnings),
      created: toIsoTimestamp(record.created, "created", warnings),
      jsonTimestamp: toIsoTimestamp(record.json_timestamp, "json_timestamp", warnings),
      analysisTitle: getNestedString(primaryAnalysis, ["title", "analysis_title"]) ?? getNestedString(aiDescriptionObject, ["title"]),
      analysisSummary: getNestedString(primaryAnalysis, ["summary", "analysis_summary"]) ?? getNestedString(aiDescriptionObject, ["summary"]),
      subjectCategory: deriveSubjectCategory(primaryAnalysis, keywords),
      subjectClass: deriveSubjectClass(primaryAnalysis, keywords),
      keywords,
      details,
      aiDescription,
      rawEvent,
      rawAnalysis,
      updatedAt
    },
    warnings
  };
};
