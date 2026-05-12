import type { Request, Response } from "express";
import { appConfig } from "../config.js";
import { EmbedSessionError, extractBearerToken, type EmbedAuthConfig, verifyEmbedToken } from "./session.js";

export type AnalyticsScopeSource = "standalone" | "embed_token";

export type AnalyticsScope = {
  source: AnalyticsScopeSource;
  organizationId: string | null;
  macs: string[];
  email: string | null;
  role: string | null;
};

export const STANDALONE_ANALYTICS_SCOPE: AnalyticsScope = {
  source: "standalone",
  organizationId: null,
  macs: [],
  email: null,
  role: null
};

const invalidEmbedSessionResponse = (code: string) => ({
  error: "Invalid embed session",
  code
});

export const getAnalyticsScopeFromRequest = async (
  request: Request,
  config: EmbedAuthConfig = appConfig.embed
): Promise<AnalyticsScope> => {
  const token = extractBearerToken(request);

  if (!token || config.authMode === "disabled") {
    return STANDALONE_ANALYTICS_SCOPE;
  }

  const session = await verifyEmbedToken(token, config);

  return {
    source: "embed_token",
    organizationId: session.orgId,
    macs: session.macs,
    email: session.email,
    role: session.role
  };
};

export const resolveAnalyticsScope = async (
  request: Request,
  response: Response,
  config: EmbedAuthConfig = appConfig.embed
): Promise<AnalyticsScope | null> => {
  try {
    return await getAnalyticsScopeFromRequest(request, config);
  } catch (error) {
    if (error instanceof EmbedSessionError && error.code === "EMBED_AUTH_MISCONFIGURED") {
      response.status(503).json({
        error: "Embed authentication is not configured",
        code: "EMBED_AUTH_MISCONFIGURED"
      });
      return null;
    }

    if (error instanceof EmbedSessionError) {
      response.status(401).json(invalidEmbedSessionResponse(error.code));
      return null;
    }

    throw error;
  }
};
