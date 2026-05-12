import { Router } from "express";
import { appConfig } from "../config.js";
import type { EmbedAuthConfig } from "../embed/session.js";
import { buildDisabledEmbedSession, EmbedSessionError, getEmbedTokenFromRequest, verifyEmbedToken } from "../embed/session.js";

type EmbedHealthConfig = EmbedAuthConfig & {
  allowedFrameAncestors?: string[];
};

const invalidEmbedSessionResponse = (code: string) => ({
  error: "Invalid embed session",
  code
});

export const buildEmbedHealth = (config: EmbedHealthConfig = appConfig.embed) => {
  const jwtConfigured = config.jwtSecret.trim().length > 0;
  const allowedFrameAncestors = config.allowedFrameAncestors ?? [];

  return {
    ok: config.authMode !== "jwt" || jwtConfigured,
    embed: {
      authMode: config.authMode,
      jwtConfigured,
      issuerConfigured: Boolean(config.tokenIssuer?.trim()),
      audienceConfigured: Boolean(config.tokenAudience?.trim()),
      allowedFrameAncestorsCount: allowedFrameAncestors.length,
      allowedFrameAncestors,
      sessionEndpoint: "/api/embed/session"
    },
    notes: ["Frame ancestors are configured statically in vercel.json for deployed frontend pages."]
  };
};

export const createEmbedRouter = (config: EmbedHealthConfig = appConfig.embed) => {
  const embedRouter = Router();

  embedRouter.get("/health", (_request, response) => {
    const health = buildEmbedHealth(config);
    response.status(health.ok ? 200 : 503).json(health);
  });

  embedRouter.get("/session", async (request, response) => {
    if (config.authMode === "disabled") {
      response.json(buildDisabledEmbedSession());
      return;
    }

    const token = getEmbedTokenFromRequest(request);
    if (!token) {
      response.status(401).json(invalidEmbedSessionResponse("EMBED_TOKEN_REQUIRED"));
      return;
    }

    try {
      response.json(await verifyEmbedToken(token, config));
    } catch (error) {
      if (error instanceof EmbedSessionError && error.code === "EMBED_AUTH_MISCONFIGURED") {
        response.status(503).json({
          error: "Embed authentication is not configured",
          code: "EMBED_AUTH_MISCONFIGURED"
        });
        return;
      }

      if (error instanceof EmbedSessionError) {
        response.status(401).json(invalidEmbedSessionResponse(error.code));
        return;
      }

      response.status(401).json(invalidEmbedSessionResponse("EMBED_TOKEN_INVALID"));
    }
  });

  return embedRouter;
};

export const embedRouter = createEmbedRouter();
