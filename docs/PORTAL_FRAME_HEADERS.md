# Portal frame headers

GrizCam Analytics is deployed as a static Vercel frontend with a serverless API. Browser iframe permission for the frontend is controlled by response headers, especially the Content Security Policy `frame-ancestors` directive.

`frame-ancestors` tells the browser which parent origins are allowed to embed a page in an iframe. If the GrizCam Portal origin is missing, portal iframe loads will be blocked even when the app route and frontend code are working. If the directive is too broad, arbitrary third-party sites could frame the analytics app.

## Current Vercel allowlist

`vercel.json` currently sends this header for frontend page responses:

```http
Content-Security-Policy: frame-ancestors 'self' http://localhost:3000 http://localhost:5173 http://127.0.0.1:3000 http://127.0.0.1:5173 https://*.fly.dev
```

Allowed frame ancestors:

- `'self'`
- `http://localhost:3000`
- `http://localhost:5173`
- `http://127.0.0.1:3000`
- `http://127.0.0.1:5173`
- `https://*.fly.dev`

Do not add `X-Frame-Options: DENY` or `X-Frame-Options: SAMEORIGIN`; either can block cross-origin portal embedding. The Vercel configuration relies on CSP `frame-ancestors`.

## Updating the portal domain

When Grizzly provides the final staging or production portal origin, add the exact origin to the `Content-Security-Policy` value in `vercel.json`.

Example production shape:

```json
{
  "key": "Content-Security-Policy",
  "value": "frame-ancestors 'self' https://<portal-production-origin> https://*.fly.dev"
}
```

Replace `https://<portal-production-origin>` with the real GrizCam Portal origin. Keep origins specific; do not use `*`.

If the existing CSP later includes other directives such as `default-src`, `script-src`, or `connect-src`, keep those directives and add `frame-ancestors` to the same CSP string instead of replacing them.

## Local development

For local iframe testing, run the portal and analytics app on one of the allowed local origins. For example, the portal can embed:

```html
<iframe src="http://localhost:5173/embed/overview"></iframe>
```

The parent page must be served from one of the allowed local origins, such as `http://localhost:3000` or `http://127.0.0.1:3000`.

Vite dev server responses are not controlled by Vercel headers. These headers are applied by Vercel deployments, so validate deployed or preview responses with:

```bash
curl -I https://<deployment-url>/embed/overview
```

Look for `Content-Security-Policy` and confirm the `frame-ancestors` value includes the portal origin.

## Troubleshooting

If the portal iframe is blocked, browser developer tools may show an error like:

```text
Refused to frame 'https://<analytics-host>' because an ancestor violates the following Content Security Policy directive: "frame-ancestors ..."
```

Check:

- The portal parent origin exactly matches an origin in `vercel.json`, including scheme, host, and port.
- The analytics deployment serving `/embed/overview` includes the latest `Content-Security-Policy` header.
- No `X-Frame-Options` response header is set to `DENY` or `SAMEORIGIN`.
- The deployed header was updated in the Vercel project that serves the static frontend.

## Secrets and runtime config

Do not put `EMBED_JWT_SECRET`, database URLs, API keys, or other secrets in Vercel headers. Headers are sent to browsers.

`PORTAL_ALLOWED_FRAME_ANCESTORS` is currently parsed by backend configuration for future runtime use. In this task, Vercel static frontend frame headers are configured in `vercel.json`, so update that file when allowed iframe origins change.
