# GrizCam Portal Integration Health

The API exposes safe unauthenticated diagnostics for Portal embed and sync readiness. These endpoints are intended for deployment checks and handoff debugging, not for exposing credentials or running ingestion.

## Endpoints

### `GET /api/embed/health`

Reports embed readiness:

- active embed auth mode: `disabled` or `jwt`
- whether the JWT secret is configured as a boolean
- whether issuer and audience are configured as booleans
- public frame ancestor origins and count
- the embed session endpoint path

This endpoint does not verify tokens and never returns raw JWTs or `EMBED_JWT_SECRET`.

### `GET /api/sync/status`

Reports Portal sync scaffold status:

- `liveCosmosImplemented: false`
- `fixtureDryRunAvailable: true`
- `writeMode: "local_file_or_fixture_only"`
- `sync_watermarks` status: `ok`, `missing`, or `unavailable`
- recent watermark rows when the table exists

The sync scaffold remains fixture/file based. This endpoint does not connect to live Cosmos, does not require Azure SDK dependencies, and does not run sync automatically.

If `sync_watermarks` is missing, the endpoint returns `watermarkTable: "missing"` instead of a 500. Apply `apps/api/migrations/003_portal_sync_scaffold.sql` before using write-mode fixture/file sync.

### `GET /api/integration/health`

Aggregates integration readiness across:

- analytics database connectivity and read-only state
- optional reports database/cache readiness
- embed auth readiness
- organization scope schema capabilities
- sync scaffold and watermark status
- safe deployment connection source labels

`ok` is false when the analytics database is unavailable or JWT embed mode is missing its secret. Reports storage, missing watermark migrations, and live Cosmos ingestion are reported as warnings because those can be optional or expected scaffold states.

## Secret Safety

The health responses return booleans and safe labels rather than credentials. They must not include:

- `DATABASE_URL`
- `POSTGRES_URL`
- `PGPASSWORD`
- `REPORTS_DATABASE_URL`
- `OPENROUTER_API_KEY`
- `EMBED_JWT_SECRET`
- `COSMOS_KEY`

Public frame ancestor origins may be returned because they are browser-facing deployment origins.
