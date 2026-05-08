# Portal patch snippets

These files are examples for the separate `grizcam_portal` repository. They are intended to be copied and adapted to the portal's exact helper names, layout components, and import paths.

## Files

- `analytics-router.tsx`: Hono route that signs a short-lived embed JWT and renders the analytics iframe.
- `nav-snippet.tsx`: Small Analytics nav link examples.
- `env.example`: Portal-side environment variables only.

## Suggested portal changes

1. Copy `analytics-router.tsx` into `grizcam_portal/src/routers/analytics.tsx`.
2. Replace `c.get("user")` and `c.get("organization")` with the portal's actual auth/session/organization helpers.
3. Confirm MACs are derived server-side from the organization/device permissions.
4. Mount the router in `src/server.tsx`.
5. Add the nav snippet to the portal navigation.
6. Set the environment variables from `env.example`.
7. Verify the analytics deployment health endpoints, then open `/analytics` in the portal.

Approximate Hono mount example:

```tsx
import analyticsRouter from "./routers/analytics";

app.route("/analytics", analyticsRouter);
```

Adjust the import path and mount location to match the portal repo style.

Before testing `/analytics`, verify:

```bash
curl https://<analytics-domain>/api/embed/health
```

The analytics response should report JWT embed mode readiness without exposing any secret values.
