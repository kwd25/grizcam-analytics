export type PortalEventRecord = {
  id?: string;
  organizationId?: string | null;
  organization_id?: string | null;
  name?: string | null;
  mac?: string | null;
  event?: string | null;
  sequence?: number | string | null;
  sensor?: string | null;
  utc_timestamp?: string | null;
  timestamp?: string | null;
  timezone?: string | null;
  fileType?: string | null;
  filename?: string | null;
  tag?: string | null;
  heatLevel?: number | string | null;
  location?: string | null;
  latitude?: number | string | null;
  longitude?: number | string | null;
  temperature?: number | string | null;
  humidity?: number | string | null;
  pressure?: number | string | null;
  bearing?: number | string | null;
  voltage?: number | string | null;
  batteryPercentage?: number | string | null;
  lux?: number | string | null;
  image_blob_url?: string | null;
  audio_blob_url?: string | null;
  video_blob_url?: string | null;
  ai_description?: unknown;
  ai_processed?: boolean | string | null;
  json_processed?: boolean | string | null;
  created?: string | null;
  json_timestamp?: string | null;
  event_analysis?: unknown;
  [key: string]: unknown;
};

export type AnalyticsEventUpsertRow = {
  id: string;
  organizationId: string | null;
  eventGroup: string;
  mac: string;
  cameraName: string | null;
  sequence: number | null;
  sensor: string | null;
  fileType: string | null;
  filename: string | null;
  utcTimestamp: string | null;
  localTimestamp: string | null;
  timezone: string | null;
  tag: string | null;
  heatLevel: number | null;
  location: string | null;
  latitude: number | null;
  longitude: number | null;
  temperature: number | null;
  humidity: number | null;
  pressure: number | null;
  bearing: number | null;
  voltage: number | null;
  batteryPercentage: number | null;
  lux: number | null;
  imageBlobUrl: string | null;
  audioBlobUrl: string | null;
  videoBlobUrl: string | null;
  aiProcessed: boolean | null;
  jsonProcessed: boolean | null;
  created: string | null;
  jsonTimestamp: string | null;
  analysisTitle: string | null;
  analysisSummary: string | null;
  subjectCategory: string | null;
  subjectClass: string | null;
  keywords: Record<string, unknown> | null;
  details: Record<string, unknown> | null;
  aiDescription: Record<string, unknown> | string | null;
  rawEvent: Record<string, unknown>;
  rawAnalysis: Record<string, unknown> | null;
  updatedAt: string;
};

export type TransformPortalEventOptions = {
  now?: () => Date;
};

export type TransformPortalEventResult =
  | {
      ok: true;
      row: AnalyticsEventUpsertRow;
      warnings: string[];
    }
  | {
      ok: false;
      reason: string;
      warnings: string[];
    };
