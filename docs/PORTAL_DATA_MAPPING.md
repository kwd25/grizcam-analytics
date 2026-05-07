# GrizCam Portal Data Mapping

## Purpose

GrizCam Analytics consumes a Postgres analytics layer derived from GrizCam Portal data. This document defines the expected mapping from Portal Cosmos records into analytics tables so organization-level scoping can use `organization_id` as a first-class tenant boundary.

This is schema and query-layer readiness only. It does not add the future Cosmos-to-Postgres sync worker, connect to live Cosmos, or require Azure SDK dependencies.

## Source Systems

- Portal Cosmos events: camera event rows, telemetry, processing state, and media references.
- Portal devices: camera/device metadata keyed by MAC address.
- Portal organizations: tenant records whose IDs map to analytics `organization_id`.
- Portal event analysis: structured or semi-structured AI analysis attached to events.
- Azure Blob media URLs: image, audio, and video locations referenced by event rows.

## Field Mapping

| Portal / Cosmos field | Analytics Postgres field | API JSON field | Notes |
| --- | --- | --- | --- |
| `organizationId` | `organization_id` | `organizationId` | Required for org-level scope and tenant isolation. |
| `id` | `id` | `id` | Stable event row ID. |
| `name` | `camera_name` / `name` | `cameraName` | Camera or device display name. |
| `mac` | `mac` | `mac` | Device/camera boundary and join key. |
| `event` | `event_group` / `event` | `event` / `eventGroup` | Logical event or burst grouping. |
| `sequence` | `sequence` | `sequence` | Burst/image sequence within a grouped event. |
| `sensor` | `sensor` | `sensor` | Camera side or sensor orientation. |
| `utc_timestamp` | `utc_timestamp` | `utcTimestamp` / `timestamp` | Canonical capture time. |
| `timestamp` | `local_timestamp` / `timestamp` | `localTimestamp` | Local display time when available. |
| `timezone` | `timezone` | `timezone` | Source timezone or offset text. |
| `fileType` | `file_type` | `fileType` | Media type compatibility field. |
| `filename` | `filename` | `filename` | Media filename. |
| `tag` | `tag` | `tag` | Source tag or lightweight label. |
| `heatLevel` | `heat_level` | `heatLevel` | Normalized heat metric. |
| `location` | `location` | `location` | Raw location text or code. |
| `latitude` | `latitude` | `latitude` | Event or camera latitude. |
| `longitude` | `longitude` | `longitude` | Event or camera longitude. |
| `temperature` | `temperature` | `temperature` | Temperature telemetry. |
| `humidity` | `humidity` | `humidity` | Humidity telemetry. |
| `pressure` | `pressure` | `pressure` | Pressure telemetry. |
| `bearing` | `bearing` | `bearing` | Directional bearing in degrees. |
| `voltage` | `voltage` | `voltage` | Voltage telemetry. |
| `batteryPercentage` | `battery_percentage` | `batteryPercentage` | Canonical battery percentage. |
| `lux` | `lux` | `lux` | Light-level telemetry. |
| `image_blob_url` | `image_blob_url` | `imageBlobUrl` | Image URL. SAS handling belongs in the sync/media layer. |
| `audio_blob_url` | `audio_blob_url` | `audioBlobUrl` | Future media support. |
| `video_blob_url` | `video_blob_url` | `videoBlobUrl` | Future media support. |
| `ai_processed` | `ai_processed` | `aiProcessed` | AI processing completion state. |
| `json_processed` | `json_processed` | `jsonProcessed` | JSON extraction completion state. |
| `ai_description.title` | `analysis_title` | `analysisTitle` | Flattened AI/LLM label. |
| `ai_description.summary` | `analysis_summary` | `analysisSummary` | Flattened AI/LLM summary. |
| `ai_description.keywords` | `keywords` jsonb | `analysis.keywords` | Preserve structured keywords for later normalization. |
| `ai_description.details` | `details` jsonb | `analysis.details` | Preserve structured details for later normalization. |
| `event_analysis` | `raw_analysis` jsonb | `analysis` | Preserve raw analysis payload when present. |
| Raw Portal event | `raw_event` jsonb | Not always exposed | Preserve source shape for auditability and future remapping. |
| Sync/update time | `updated_at` | Not usually exposed | Analytics freshness and upsert bookkeeping. |

## Required Analytics Columns

Portal-backed analytics tables should expose:

- `organization_id`
- `mac`
- `utc_timestamp`
- `camera_name` or `name`
- Event identity and grouping fields such as `id`, `event`, or `event_group`
- Semantic fields such as `subject_category` and `subject_class` when available

## Scope Behavior

`organization_id` is the primary tenant boundary. `mac` is the camera/device boundary inside that tenant.

Embed JWT scope maps as follows:

- JWT `orgId` -> analytics `organization_id`
- JWT `macs` -> analytics `mac`

When both are present, MAC filters narrow rows within the organization. When MACs are empty, org-level embed access is allowed only for relations that expose `organization_id`. Relations without `organization_id` must continue returning zero rows for empty-MAC embed tokens.

## Backward Compatibility

Existing demo data without `organization_id` may still run in standalone mode. Embedded org-level access requires either an `organization_id`-capable relation or a non-empty MAC scope.

The synthetic generator now emits deterministic organization IDs for demo data, but generated exports remain ignored and should not be committed.
