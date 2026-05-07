# GrizCam Analytics

GrizCam Analytics is a full-stack analytics dashboard and reporting app for wildlife camera event data. It combines operational monitoring, exploratory analysis, SQL-assisted querying, and generated operations briefings for synthetic 2025 GrizCam telemetry.

## Tech Stack

- React, TypeScript, Vite
- Tailwind CSS
- React Router
- TanStack Query
- Recharts
- Node.js, Express, TypeScript
- PostgreSQL via `pg`
- Shared workspace package for filters, schemas, and report types
- Vercel-compatible static frontend and serverless API entrypoint

## Project Layout

```text
apps/
  api/      Express API, analytics routes, report generation, migrations
  web/      React dashboard and report UI
packages/
  shared/   Shared schemas, filters, and TypeScript types
synthetic/  Synthetic event generation utilities and notes
api/        Vercel serverless API entrypoint
```

## Features

- URL-backed dashboard filters for camera, date range, time of day, subject, and telemetry fields
- Operational overview dashboard with KPIs, camera health, telemetry, pipeline, and notable event sections
- Analytics Lab for anomaly analysis, forecasting baselines, camera groupings, and data-quality checks
- Reports page for cached natural-language operational briefings generated from analytics aggregates
- Event explorer with server-side sorting, pagination, debounced text search, and row expansion
- Parameterized SQL and read-only query validation throughout the API
- Runtime API base URL support for local and hosted deployments
- Production-oriented API protections including `helmet`, rate limiting, strict allowed origins, and disabled-by-default CSV export

## Local Setup

Install dependencies:

```bash
npm install
```

Create a local environment file:

```bash
cp .env.example .env
```

Configure Postgres. For local development, the default database name is:

```text
grizcam_synthetic_2025
```

The API uses `DATABASE_URL` when set. Otherwise it falls back to:

- `PGHOST`
- `PGPORT`
- `PGDATABASE`
- `PGUSER`
- `PGPASSWORD`

## Environment Variables

Use placeholders only in committed files. Store real values in local `.env` files or deployment environment settings.

```bash
PORT=4000
NODE_ENV=development
ALLOWED_ORIGINS=http://localhost:5173,http://127.0.0.1:5173
DATABASE_URL=
PGHOST=localhost
PGPORT=5432
PGDATABASE=grizcam_synthetic_2025
PGUSER=
PGPASSWORD=
DEMO_EXPORTS_ENABLED=false
API_RATE_LIMIT_WINDOW_MS=60000
API_RATE_LIMIT_MAX=120
OPENROUTER_API_KEY=
OPENROUTER_BASE_URL=https://openrouter.ai/api/v1
OPENROUTER_MODEL=anthropic/claude-sonnet-4.6
REPORT_PROMPT_VERSION=v1
REPORTS_DATABASE_URL=
VITE_API_BASE_URL=
VITE_DEMO_EXPORTS_ENABLED=false
VITE_DEMO_LABEL=Synthetic data demo
VITE_APP_TITLE=GrizCam Demo | Yellowstone 2025 Analytics
```

`OPENROUTER_API_KEY` is server-only. It enables the query assistant and report briefing generator.

`REPORTS_DATABASE_URL` is recommended for a dedicated writable reports database. If it is unset, report storage can fall back to `DATABASE_URL` when that connection is writable.

Leave `VITE_API_BASE_URL` empty on Vercel to use same-origin `/api` calls. Set it to `http://localhost:4000` only when the frontend should call a separately addressed local API.

## Development

Run the API and web app together:

```bash
npm run dev
```

Default local URLs:

- Frontend: [http://localhost:5173](http://localhost:5173)
- Backend: [http://localhost:4000](http://localhost:4000)

Run workspaces separately:

```bash
npm run dev --workspace @grizcam/api
npm run dev --workspace @grizcam/web
```

## Validation

```bash
npm run lint
npm run typecheck
npm run test --workspace @grizcam/api
npm run build
```

The root build compiles the shared package first, then the API, then the web app.

## Deployment

The project is configured for Vercel:

- Build command: `npm run vercel-build`
- Static output: `apps/web/dist`
- API handler: `api/index.js`
- Rewrites: `/api/*` to the serverless API handler and all other routes to the SPA

Recommended deployment steps:

1. Provision a managed Postgres database seeded with the synthetic GrizCam event tables.
2. Use a read-only database user for analytics reads.
3. Provide a writable reports database through `REPORTS_DATABASE_URL` when persistent report caching is needed.
4. Configure the environment variables in Vercel.
5. Deploy with `vercel deploy` or `vercel deploy --prod`.

Optional reports table migration:

```bash
psql "$REPORTS_DATABASE_URL" -f apps/api/migrations/001_analytics_reports.sql
```

The API auto-ensures the `analytics_reports` table on startup for the active writable reports connection, so the manual migration is optional for normal deployment.

## Key API Routes

- `GET /api/health`
- `GET /api/devices`
- `GET /api/filters/options`
- `GET /api/kpis`
- `GET /api/charts/daily-activity`
- `GET /api/charts/hourly-heatmap`
- `GET /api/charts/time-of-day-composition`
- `GET /api/charts/subject-by-camera`
- `GET /api/charts/composition`
- `GET /api/overview`
- `GET /api/analytics-lab`
- `GET /api/day/:date/summary`
- `GET /api/events`
- `GET /api/events/export`
- `POST /api/query/generate-sql`
- `POST /api/query/follow-up`
- `GET /api/reports/latest`
- `GET /api/reports/status`
- `GET /api/reports/health`
- `POST /api/reports/generate`

`GET /api/events/export` is disabled by default unless `DEMO_EXPORTS_ENABLED=true`.

## Reports

Report generation reuses existing `overview` and `analytics-lab` aggregates rather than sending raw events to the model. Reports are cached by snapshot hash, prompt version, and model. If persistent report storage is unavailable, the Reports page can generate an on-demand report without saving it.

## Synthetic Data

The `synthetic/` folder contains utilities and notes for generating synthetic camera event records. Generated raw event exports are intentionally ignored and should not be committed.

For Portal integration readiness, see [`docs/PORTAL_DATA_MAPPING.md`](docs/PORTAL_DATA_MAPPING.md) for the Cosmos-to-Postgres analytics field mapping and organization scope behavior.
