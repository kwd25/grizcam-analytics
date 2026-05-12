import assert from "node:assert/strict";
import test from "node:test";
import { SignJWT } from "jose";
import {
  buildDisabledEmbedSession,
  buildEmbedSessionFromPayload,
  EmbedSessionError,
  type EmbedAuthConfig,
  verifyEmbedToken
} from "./session.js";

const jwtSecret = "local_test_secret";
const baseConfig: EmbedAuthConfig = {
  authMode: "jwt",
  jwtSecret,
  tokenIssuer: "grizcam_portal",
  tokenAudience: "grizcam_analytics"
};

const secretBytes = new TextEncoder().encode(jwtSecret);

const signEmbedToken = async (payload: Record<string, unknown>, config = baseConfig) => {
  const jwt = new SignJWT(payload).setProtectedHeader({ alg: "HS256" });

  if (config.tokenIssuer) {
    jwt.setIssuer(config.tokenIssuer);
  }

  if (config.tokenAudience) {
    jwt.setAudience(config.tokenAudience);
  }

  return jwt.sign(secretBytes);
};

const assertEmbedError = (code: string) => (error: unknown) => error instanceof EmbedSessionError && error.code === code;

test("buildDisabledEmbedSession returns safe disabled session", () => {
  assert.deepEqual(buildDisabledEmbedSession(), {
    authenticated: false,
    mode: "disabled",
    orgId: null,
    email: null,
    name: null,
    role: null,
    macs: [],
    expiresAt: null
  });
});

test("verifyEmbedToken returns sanitized session for valid jwt", async () => {
  const expiresAtSeconds = Math.floor(Date.now() / 1000) + 3600;
  const token = await signEmbedToken({
    orgId: " org_123 ",
    email: " user@example.com ",
    name: " User Name ",
    role: " admin ",
    macs: [" F0F5BD77B104 ", "", "F0F5BD77B104", " AABBCC112233 "],
    exp: expiresAtSeconds
  });

  assert.deepEqual(await verifyEmbedToken(token, baseConfig), {
    authenticated: true,
    mode: "jwt",
    orgId: "org_123",
    email: "user@example.com",
    name: "User Name",
    role: "admin",
    macs: ["F0F5BD77B104", "AABBCC112233"],
    expiresAt: new Date(expiresAtSeconds * 1000).toISOString()
  });
});

test("buildEmbedSessionFromPayload removes empty optional strings and invalid macs", () => {
  assert.deepEqual(
    buildEmbedSessionFromPayload({
      orgId: " org_123 ",
      email: " ",
      name: "\t",
      role: " viewer ",
      macs: [" MAC1 ", 42, "", "MAC1", " MAC2 "]
    }),
    {
      authenticated: true,
      mode: "jwt",
      orgId: "org_123",
      email: null,
      name: null,
      role: "viewer",
      macs: ["MAC1", "MAC2"],
      expiresAt: null
    }
  );
});

test("verifyEmbedToken rejects token without orgId", async () => {
  const token = await signEmbedToken({ email: "user@example.com" });

  await assert.rejects(() => verifyEmbedToken(token, baseConfig), assertEmbedError("EMBED_TOKEN_INVALID"));
});

test("verifyEmbedToken rejects expired token", async () => {
  const token = await signEmbedToken({
    orgId: "org_123",
    exp: Math.floor(Date.now() / 1000) - 60
  });

  await assert.rejects(() => verifyEmbedToken(token, baseConfig), assertEmbedError("EMBED_TOKEN_EXPIRED"));
});

test("verifyEmbedToken enforces issuer", async () => {
  const token = await signEmbedToken(
    {
      orgId: "org_123",
      exp: Math.floor(Date.now() / 1000) + 3600
    },
    { ...baseConfig, tokenIssuer: "wrong_issuer" }
  );

  await assert.rejects(() => verifyEmbedToken(token, baseConfig), assertEmbedError("EMBED_TOKEN_INVALID"));
});

test("verifyEmbedToken enforces audience", async () => {
  const token = await signEmbedToken(
    {
      orgId: "org_123",
      exp: Math.floor(Date.now() / 1000) + 3600
    },
    { ...baseConfig, tokenAudience: "wrong_audience" }
  );

  await assert.rejects(() => verifyEmbedToken(token, baseConfig), assertEmbedError("EMBED_TOKEN_INVALID"));
});
