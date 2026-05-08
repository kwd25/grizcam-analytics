# GrizCam Portal Integration

## Overview

GrizCam Analytics is designed to be embedded inside `grizcam_portal` with a short-lived JWT and an iframe:

```text
grizcam_portal
  -> signs a short-lived embed JWT for the current user and organization
  -> renders an iframe to grizcam-analytics /embed/overview?token=...
  -> analytics verifies the token through /api/embed/session
  -> analytics scopes dashboard and report queries by organization_id and macs
```

The portal owns authentication, user authorization, organization membership, and camera/device permissions. The analytics app owns visualization, report generation, and read-only analytics queries against its Postgres analytics layer.

## What the portal team must change

- Add portal environment variables.
- Add an analytics router that signs the embed JWT.
- Mount the router in the portal server, usually at `/analytics`.
- Add an Analytics nav link.
- Confirm the portal production origin is allowed by analytics frame headers.
- Confirm analytics migrations, schema, and sync readiness for `organization_id` and MAC-based scoping.
- Test analytics health endpoints before and after wiring the portal route.

## Required portal env vars

Set these in `grizcam_portal` server-side environment configuration:

```bash
ANALYTICS_EMBED_URL=https://<analytics-domain>/embed/overview
ANALYTICS_EMBED_SECRET=<same-secret-configured-as-analytics-EMBED_JWT_SECRET>
ANALYTICS_EMBED_ISSUER=grizcam_portal
ANALYTICS_EMBED_AUDIENCE=grizcam_analytics
```

Optional:

```bash
ANALYTICS_EMBED_TOKEN_TTL=15m
```

`ANALYTICS_EMBED_SECRET` is server-only. Never expose it to client JavaScript, templates, logs, or browser-visible runtime config.

## Required analytics env vars

Set these in the GrizCam Analytics deployment:

```bash
EMBED_AUTH_MODE=jwt
EMBED_JWT_SECRET=<same-secret-as-portal>
EMBED_TOKEN_ISSUER=grizcam_portal
EMBED_TOKEN_AUDIENCE=grizcam_analytics
VITE_PORTAL_EMBED_MODE_ENABLED=true
VITE_PORTAL_BRAND_LABEL=GrizCam Portal
VITE_EMBED_DEFAULT_ROUTE=/embed/overview
PORTAL_ALLOWED_FRAME_ANCESTORS=https://<portal-origin>
```

Frame permission is also required. `PORTAL_ALLOWED_FRAME_ANCESTORS` is backend runtime config for reporting/debug readiness, while Vercel static frontend frame headers are currently controlled by `vercel.json`. See [Portal frame headers](PORTAL_FRAME_HEADERS.md) before production testing.

## JWT payload contract

The portal should sign a payload shaped like this:

```json
{
  "orgId": "org_123",
  "email": "user@example.com",
  "name": "Jane Doe",
  "role": "admin",
  "macs": ["F0F5BD77B104"],
  "iat": 123,
  "exp": 456,
  "iss": "grizcam_portal",
  "aud": "grizcam_analytics"
}
```

- `orgId` maps to analytics `organization_id`.
- `macs` maps to analytics `mac`.
- `macs` should include only cameras the portal user is allowed to access.
- `macs` may be empty only when `organization_id` is populated and org-level access is desired.
- Until live data has `organization_id`, include MACs.
- `email` and `name` are display/debug context, not cache identity.
- `role` currently does not widen access unless future analytics code explicitly uses it.

## Portal route patch

Copy and adapt [docs/portal-patch/analytics-router.tsx](portal-patch/analytics-router.tsx):

```tsx
import { Hono } from "hono";
import { SignJWT } from "jose";

const analyticsRouter = new Hono();

analyticsRouter.get("/", async (c) => {
  // Adapt these to the portal's actual auth/session helpers.
  const user = c.get("user");
  const organization = c.get("organization");

  if (!user || !organization) {
    return c.redirect("/login");
  }

  const analyticsEmbedUrl = process.env.ANALYTICS_EMBED_URL;
  const embedSecret = process.env.ANALYTICS_EMBED_SECRET;
  const issuer = process.env.ANALYTICS_EMBED_ISSUER ?? "grizcam_portal";
  const audience = process.env.ANALYTICS_EMBED_AUDIENCE ?? "grizcam_analytics";
  const tokenTtl = process.env.ANALYTICS_EMBED_TOKEN_TTL ?? "15m";

  if (!analyticsEmbedUrl || !embedSecret) {
    return c.text("Analytics embed is not configured.", 503);
  }

  // Derive MACs server-side from the portal organization/device permissions.
  // Do not accept MACs from query params or other user-controlled input.
  const macs =
    organization.devices
      ?.map((device: { mac?: string | null }) => device.mac)
      .filter((mac: string | null | undefined): mac is string => Boolean(mac)) ?? [];

  const token = await new SignJWT({
    orgId: organization.id,
    email: user.email,
    name: user.name,
    role: user.role,
    macs
  })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuer(issuer)
    .setAudience(audience)
    .setIssuedAt()
    .setExpirationTime(tokenTtl)
    .sign(new TextEncoder().encode(embedSecret));

  const iframeUrl = new URL(analyticsEmbedUrl);
  iframeUrl.searchParams.set("token", token);

  // Do not log the token or iframe URL with token attached.
  return c.html(
    <div class="analytics-frame-page">
      <iframe
        src={iframeUrl.toString()}
        class="analytics-frame"
        title="GrizCam Analytics"
        allow="fullscreen"
      />
    </div>
  );
});

export default analyticsRouter;
```

Minimal CSS example:

```css
.analytics-frame-page {
  height: calc(100vh - 80px);
  width: 100%;
}

.analytics-frame {
  border: 0;
  height: 100%;
  width: 100%;
}
```

If the portal does not already use `jose`, install it in `grizcam_portal`. Do not add it to the analytics repo for this handoff task.

## Portal nav patch

Copy and adapt [docs/portal-patch/nav-snippet.tsx](portal-patch/nav-snippet.tsx):

```tsx
<a href="/analytics" class={currentPath?.startsWith("/analytics") ? "active" : ""}>
  Analytics
</a>
```

If the portal already has a nav component, prefer that style:

```tsx
<NavLink href="/analytics" active={currentPath?.startsWith("/analytics")}>
  Analytics
</NavLink>
```

## Analytics app URLs

Recommended embedded routes:

- `/embed/overview`
- `/embed/ops`
- `/embed/advanced`
- `/embed/reports`

Do not expose `/embed/query` yet.

## Health checks

Use these analytics deployment endpoints during handoff:

- `GET <analytics>/api/embed/health`: reports embed auth mode, JWT readiness booleans, frame ancestor config, and session endpoint path.
- `GET <analytics>/api/sync/status`: reports dry-run sync scaffold status, live Cosmos implementation status, and watermark table readiness.
- `GET <analytics>/api/integration/health`: aggregates analytics DB, reports storage, embed auth, scope schema, and sync readiness.
- `GET <analytics>/api/reports/health`: reports report storage and OpenRouter readiness for generated briefings.

These endpoints must not return secrets, raw JWTs, database URLs, API keys, or Cosmos keys.

## Frame/CSP setup

See [Portal frame headers](PORTAL_FRAME_HEADERS.md).

The portal production origin must appear in analytics `frame-ancestors`. If the iframe is blank or blocked, check the browser console for a CSP `frame-ancestors` error and confirm the deployed analytics frontend is serving the expected header.

Do not use `X-Frame-Options: DENY` or `X-Frame-Options: SAMEORIGIN` for cross-domain portal embedding. Those values can block the portal iframe even when JWT auth is correct.

## Data readiness

See [Portal data mapping](PORTAL_DATA_MAPPING.md).

Analytics reads Postgres at runtime, not Cosmos directly. The current sync work provides a dry-run scaffold for transforming Portal Cosmos-style event JSON into analytics Postgres rows. For production data, Cosmos events must be transformed and upserted into analytics Postgres by future ingestion work.

Live Cosmos sync is not implemented yet, no Azure SDK dependency is required, and sync does not run on API startup.

`organization_id` is the primary tenant boundary. `mac` is the device/camera boundary inside that tenant.

## Local development flow

Analytics API/web:

```bash
npm install
npm run dev
```

Portal:

```bash
# Set ANALYTICS_EMBED_URL and ANALYTICS_EMBED_SECRET in the portal server env.
# Run the portal dev server using the portal repo's normal command.
# Open /analytics.
```

For local iframe testing, the portal parent origin must be allowed by the analytics frame header configuration in deployed environments. Vite dev responses are not controlled by `vercel.json`; validate production or preview frame headers with `curl -I https://<analytics-domain>/embed/overview`.

## Troubleshooting

- Iframe blocked: check browser console for `frame-ancestors`, confirm the portal origin exactly matches the analytics allowlist, and ensure no `X-Frame-Options: DENY` or `SAMEORIGIN` header is present.
- Invalid embed session: confirm `ANALYTICS_EMBED_SECRET` matches `EMBED_JWT_SECRET`, issuer/audience match, token TTL has not expired, and the portal is appending `token` to the iframe URL.
- Analytics loads but shows no rows: confirm `orgId` maps to populated `organization_id`, include MACs until live data has `organization_id`, and verify the user has portal device permissions.
- Reports unavailable: check `GET <analytics>/api/reports/health`, `REPORTS_DATABASE_URL`, reports table readiness, and `OPENROUTER_API_KEY`.
- Sync watermark missing: apply `apps/api/migrations/003_portal_sync_scaffold.sql` before write-mode fixture/file sync. Missing watermark status is expected for deployments that have not enabled sync state yet.
- OpenRouter not configured: query assistant and generated reports require server-only OpenRouter configuration; dashboards should still load without it.
- Stale report cache: reports are scoped by analytics snapshot, prompt version, model, organization, and MAC set. Generate a new report after data or scope changes.
- `401` from `/api/embed/session`: inspect the response code, check JWT mode readiness, and verify the token is present as a Bearer token or one-time iframe query token.
- CORS/framing confusion: CORS controls API fetches; `frame-ancestors` controls whether the portal can embed the analytics page. A framing failure is usually a CSP issue, not an API CORS issue.

## Security notes

- Use short-lived JWTs.
- Never put `EMBED_JWT_SECRET` or `ANALYTICS_EMBED_SECRET` in frontend code.
- Never log tokens.
- The token is passed once via iframe URL, then removed by the analytics frontend.
- Use HTTPS in production.
- Derive the MAC list server-side from portal organization/device permissions.
- Do not trust user-supplied MAC query params.
