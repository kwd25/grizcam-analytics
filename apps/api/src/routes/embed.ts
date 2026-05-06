import { Router } from "express";
import { appConfig } from "../config.js";
import type { EmbedAuthConfig } from "../embed/session.js";
import { buildDisabledEmbedSession, EmbedSessionError, getEmbedTokenFromRequest, verifyEmbedToken } from "../embed/session.js";

const invalidEmbedSessionResponse = (code: string) => ({
  error: "Invalid embed session",
  code
});

export const createEmbedRouter = (config: EmbedAuthConfig = appConfig.embed) => {
  const embedRouter = Router();

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
