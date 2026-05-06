import type { Request } from "express";
import { errors, jwtVerify } from "jose";
import { z } from "zod";

export type EmbedAuthMode = "disabled" | "jwt";

export type EmbedAuthConfig = {
  authMode: EmbedAuthMode;
  jwtSecret: string;
  tokenIssuer?: string;
  tokenAudience?: string;
};

export type EmbedSession = {
  authenticated: boolean;
  mode: EmbedAuthMode;
  orgId: string | null;
  email: string | null;
  name: string | null;
  role: string | null;
  macs: string[];
  expiresAt: string | null;
};

export type EmbedSessionErrorCode = "EMBED_TOKEN_REQUIRED" | "EMBED_TOKEN_INVALID" | "EMBED_TOKEN_EXPIRED" | "EMBED_AUTH_MISCONFIGURED";

export class EmbedSessionError extends Error {
  constructor(
    public readonly code: EmbedSessionErrorCode,
    message = "Invalid embed session"
  ) {
    super(message);
    this.name = "EmbedSessionError";
  }
}

const embedTokenPayloadSchema = z.object({
  orgId: z.string().trim().min(1),
  email: z.string().optional(),
  name: z.string().optional(),
  role: z.string().optional(),
  macs: z.array(z.unknown()).optional(),
  iat: z.number().optional(),
  exp: z.number().optional(),
  iss: z.string().optional(),
  aud: z.union([z.string(), z.array(z.string())]).optional()
});

export type EmbedTokenPayload = z.infer<typeof embedTokenPayloadSchema>;

const textEncoder = new TextEncoder();

const cleanOptionalString = (value: string | undefined): string | null => {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
};

const cleanMacs = (macs: unknown[] | undefined): string[] => {
  const seen = new Set<string>();
  const cleaned: string[] = [];

  for (const mac of macs ?? []) {
    if (typeof mac !== "string") {
      continue;
    }

    const trimmed = mac.trim();
    if (!trimmed || seen.has(trimmed)) {
      continue;
    }

    seen.add(trimmed);
    cleaned.push(trimmed);
  }

  return cleaned;
};

const cleanVerifierOption = (value: string | undefined) => {
  const trimmed = value?.trim();
  return trimmed ? trimmed : undefined;
};

export const extractBearerToken = (request: Request): string | undefined => {
  const authorization = request.header("authorization");
  const match = authorization?.match(/^Bearer\s+(.+)$/i);
  const token = match?.[1]?.trim();

  return token || undefined;
};

export const getEmbedTokenFromRequest = (request: Request): string | undefined => {
  const bearerToken = extractBearerToken(request);
  if (bearerToken) {
    return bearerToken;
  }

  const queryToken = request.query.token;
  if (typeof queryToken !== "string") {
    return undefined;
  }

  return queryToken.trim() || undefined;
};

export const buildDisabledEmbedSession = (): EmbedSession => ({
  authenticated: false,
  mode: "disabled",
  orgId: null,
  email: null,
  name: null,
  role: null,
  macs: [],
  expiresAt: null
});

export const buildEmbedSessionFromPayload = (payload: EmbedTokenPayload): EmbedSession => ({
  authenticated: true,
  mode: "jwt",
  orgId: payload.orgId.trim(),
  email: cleanOptionalString(payload.email),
  name: cleanOptionalString(payload.name),
  role: cleanOptionalString(payload.role),
  macs: cleanMacs(payload.macs),
  expiresAt: payload.exp === undefined ? null : new Date(payload.exp * 1000).toISOString()
});

export const verifyEmbedToken = async (token: string, config: EmbedAuthConfig): Promise<EmbedSession> => {
  const jwtSecret = config.jwtSecret.trim();
  if (!jwtSecret) {
    throw new EmbedSessionError("EMBED_AUTH_MISCONFIGURED", "Embed authentication is not configured");
  }

  try {
    const { payload } = await jwtVerify(token, textEncoder.encode(jwtSecret), {
      issuer: cleanVerifierOption(config.tokenIssuer),
      audience: cleanVerifierOption(config.tokenAudience)
    });
    const parsed = embedTokenPayloadSchema.parse(payload);

    return buildEmbedSessionFromPayload(parsed);
  } catch (error) {
    if (error instanceof EmbedSessionError) {
      throw error;
    }

    if (error instanceof errors.JWTExpired) {
      throw new EmbedSessionError("EMBED_TOKEN_EXPIRED");
    }

    throw new EmbedSessionError("EMBED_TOKEN_INVALID");
  }
};
