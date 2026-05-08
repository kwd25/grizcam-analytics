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

/*
Minimal CSS example; adapt to the portal layout system.

.analytics-frame-page {
  height: calc(100vh - 80px);
  width: 100%;
}

.analytics-frame {
  border: 0;
  height: 100%;
  width: 100%;
}

Notes:
- Ensure `jose` is installed in grizcam_portal if the portal does not already use it.
- Keep ANALYTICS_EMBED_SECRET server-only. Never expose it to client JavaScript.
- The token should be short-lived and generated per request.
*/
