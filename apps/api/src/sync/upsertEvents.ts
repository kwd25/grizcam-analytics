import type { AnalyticsEventUpsertRow } from "./portalTypes.js";

type Queryable = {
  query: (text: string, values: unknown[]) => Promise<{ rowCount: number | null }>;
};

type ColumnSpec = {
  column: string;
  value: (row: AnalyticsEventUpsertRow) => unknown;
  cast?: string;
  update?: boolean;
};

const columns: ColumnSpec[] = [
  { column: "id", value: (row) => row.id, update: false },
  { column: "organization_id", value: (row) => row.organizationId },
  { column: "name", value: (row) => row.cameraName },
  { column: "camera_name", value: (row) => row.cameraName },
  { column: "mac", value: (row) => row.mac },
  { column: "event", value: (row) => row.eventGroup },
  { column: "utc_timestamp", value: (row) => row.utcTimestamp },
  { column: "timestamp", value: (row) => row.localTimestamp },
  { column: "sequence", value: (row) => row.sequence },
  { column: "sensor", value: (row) => row.sensor },
  { column: "location", value: (row) => row.location },
  { column: "latitude", value: (row) => row.latitude },
  { column: "longitude", value: (row) => row.longitude },
  { column: "temperature", value: (row) => row.temperature },
  { column: "humidity", value: (row) => row.humidity },
  { column: "pressure", value: (row) => row.pressure },
  { column: "voltage", value: (row) => row.voltage },
  { column: "bearing", value: (row) => row.bearing },
  { column: "battery_percentage", value: (row) => row.batteryPercentage },
  { column: "lux", value: (row) => row.lux },
  { column: "heat_level", value: (row) => row.heatLevel },
  { column: "file_type", value: (row) => row.fileType },
  { column: "filename", value: (row) => row.filename },
  { column: "image_blob_url", value: (row) => row.imageBlobUrl },
  { column: "audio_blob_url", value: (row) => row.audioBlobUrl },
  { column: "video_blob_url", value: (row) => row.videoBlobUrl },
  { column: "created", value: (row) => row.created },
  { column: "ai_processed", value: (row) => row.aiProcessed },
  { column: "json_processed", value: (row) => row.jsonProcessed },
  { column: "json_timestamp", value: (row) => row.jsonTimestamp },
  { column: "timezone", value: (row) => row.timezone },
  { column: "tag", value: (row) => row.tag },
  { column: "analysis", value: (row) => row.rawAnalysis ?? (typeof row.aiDescription === "string" ? null : row.aiDescription), cast: "jsonb" },
  {
    column: "ai_description",
    value: (row) => (typeof row.aiDescription === "string" ? row.aiDescription : row.aiDescription ? JSON.stringify(row.aiDescription) : null)
  },
  { column: "analysis_title", value: (row) => row.analysisTitle },
  { column: "analysis_summary", value: (row) => row.analysisSummary },
  { column: "subject_class", value: (row) => row.subjectClass },
  { column: "subject_category", value: (row) => row.subjectCategory },
  { column: "raw_event", value: (row) => row.rawEvent, cast: "jsonb" },
  { column: "raw_analysis", value: (row) => row.rawAnalysis, cast: "jsonb" },
  { column: "updated_at", value: (row) => row.updatedAt }
];

const quoteIdentifier = (identifier: string) => `"${identifier.replace(/"/g, '""')}"`;

export const UPSERT_EVENTS_COLUMN_COUNT = columns.length;

export const buildUpsertEventsQuery = (rows: AnalyticsEventUpsertRow[]) => {
  if (rows.length === 0) {
    throw new Error("buildUpsertEventsQuery requires at least one row");
  }

  const values: unknown[] = [];
  const valueGroups = rows.map((row) => {
    const placeholders = columns.map((column) => {
      values.push(column.value(row));
      const placeholder = `$${values.length}`;
      return column.cast ? `${placeholder}::${column.cast}` : placeholder;
    });
    return `(${placeholders.join(", ")})`;
  });
  const insertColumns = columns.map((column) => quoteIdentifier(column.column)).join(", ");
  const updateColumns = columns
    .filter((column) => column.update !== false)
    .map((column) => `${quoteIdentifier(column.column)} = excluded.${quoteIdentifier(column.column)}`)
    .join(",\n    ");

  return {
    text: `insert into events (${insertColumns})
values
  ${valueGroups.join(",\n  ")}
on conflict (id) do update set
    ${updateColumns}`,
    values
  };
};

export const upsertAnalyticsEvents = async (clientOrPool: Queryable, rows: AnalyticsEventUpsertRow[]) => {
  const query = buildUpsertEventsQuery(rows);
  const result = await clientOrPool.query(query.text, query.values);
  return {
    rowCount: result.rowCount ?? 0
  };
};
