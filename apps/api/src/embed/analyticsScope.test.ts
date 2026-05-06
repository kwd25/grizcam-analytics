import assert from "node:assert/strict";
import test from "node:test";
import type { Request, Response } from "express";
import { SignJWT } from "jose";
import {
  getAnalyticsScopeFromRequest,
  resolveAnalyticsScope,
  STANDALONE_ANALYTICS_SCOPE,
  type AnalyticsScope
} from "./analyticsScope.js";
import { EmbedSessionError, type EmbedAuthConfig } from "./session.js";

const jwtSecret = "local_test_secret";
const jwtConfig: EmbedAuthConfig = {
  authMode: "jwt",
  jwtSecret,
  tokenIssuer: "grizcam_portal",
  tokenAudience: "grizcam_analytics"
};

const secretBytes = new TextEncoder().encode(jwtSecret);

const signEmbedToken = async (payload: Record<string, unknown>, config = jwtConfig) => {
  const jwt = new SignJWT(payload).setProtectedHeader({ alg: "HS256" });

  if (config.tokenIssuer) {
    jwt.setIssuer(config.tokenIssuer);
  }

  if (config.tokenAudience) {
    jwt.setAudience(config.tokenAudience);
  }

  return jwt.sign(secretBytes);
};

const makeRequest = (input: { authorization?: string; queryToken?: string } = {}) =>
  ({
    query: input.queryToken === undefined ? {} : { token: input.queryToken },
    header: (name: string) => {
      if (name.toLowerCase() !== "authorization") {
        return undefined;
      }

      return input.authorization;
    }
  }) as Request;

const makeResponse = () => {
  const state: {
    statusCode: number;
    payload: unknown;
  } = {
    statusCode: 200,
    payload: null
  };

  const response = {
    status: (statusCode: number) => {
      state.statusCode = statusCode;
      return response;
    },
    json: (payload: unknown) => {
      state.payload = payload;
      return response;
    }
  } as Response;

  return { response, state };
};

const assertEmbedError = (code: string) => (error: unknown) => error instanceof EmbedSessionError && error.code === code;

test("getAnalyticsScopeFromRequest returns standalone without authorization header", async () => {
  assert.deepEqual(await getAnalyticsScopeFromRequest(makeRequest(), jwtConfig), STANDALONE_ANALYTICS_SCOPE);
});

test("getAnalyticsScopeFromRequest returns standalone in disabled mode even with token", async () => {
  const token = await signEmbedToken({
    orgId: "org_123",
    exp: Math.floor(Date.now() / 1000) + 3600
  });

  assert.deepEqual(
    await getAnalyticsScopeFromRequest(makeRequest({ authorization: `Bearer ${token}` }), {
      ...jwtConfig,
      authMode: "disabled",
      jwtSecret: ""
    }),
    STANDALONE_ANALYTICS_SCOPE
  );
});

test("getAnalyticsScopeFromRequest returns embed scope for valid jwt", async () => {
  const token = await signEmbedToken({
    orgId: " org_123 ",
    email: " user@example.com ",
    role: " admin ",
    macs: [" F0F5BD77B104 ", "", "F0F5BD77B104", " AABBCC112233 "],
    exp: Math.floor(Date.now() / 1000) + 3600
  });

  const expected: AnalyticsScope = {
    source: "embed_token",
    organizationId: "org_123",
    email: "user@example.com",
    role: "admin",
    macs: ["F0F5BD77B104", "AABBCC112233"]
  };

  assert.deepEqual(await getAnalyticsScopeFromRequest(makeRequest({ authorization: `Bearer ${token}` }), jwtConfig), expected);
});

test("getAnalyticsScopeFromRequest rejects malformed bearer token in jwt mode", async () => {
  await assert.rejects(
    () => getAnalyticsScopeFromRequest(makeRequest({ authorization: "Bearer not-a-jwt" }), jwtConfig),
    assertEmbedError("EMBED_TOKEN_INVALID")
  );
});

test("getAnalyticsScopeFromRequest rejects expired bearer token in jwt mode", async () => {
  const token = await signEmbedToken({
    orgId: "org_123",
    exp: Math.floor(Date.now() / 1000) - 60
  });

  await assert.rejects(
    () => getAnalyticsScopeFromRequest(makeRequest({ authorization: `Bearer ${token}` }), jwtConfig),
    assertEmbedError("EMBED_TOKEN_EXPIRED")
  );
});

test("getAnalyticsScopeFromRequest returns standalone without token in jwt mode", async () => {
  assert.deepEqual(await getAnalyticsScopeFromRequest(makeRequest(), jwtConfig), STANDALONE_ANALYTICS_SCOPE);
});

test("getAnalyticsScopeFromRequest ignores query token for analytics scope", async () => {
  const token = await signEmbedToken({
    orgId: "org_123",
    exp: Math.floor(Date.now() / 1000) + 3600
  });

  assert.deepEqual(await getAnalyticsScopeFromRequest(makeRequest({ queryToken: token }), jwtConfig), STANDALONE_ANALYTICS_SCOPE);
});

test("resolveAnalyticsScope maps invalid bearer token to safe 401 response", async () => {
  const { response, state } = makeResponse();

  assert.equal(await resolveAnalyticsScope(makeRequest({ authorization: "Bearer not-a-jwt" }), response, jwtConfig), null);
  assert.equal(state.statusCode, 401);
  assert.deepEqual(state.payload, {
    error: "Invalid embed session",
    code: "EMBED_TOKEN_INVALID"
  });
});

test("resolveAnalyticsScope preserves expired bearer token response code", async () => {
  const token = await signEmbedToken({
    orgId: "org_123",
    exp: Math.floor(Date.now() / 1000) - 60
  });
  const { response, state } = makeResponse();

  assert.equal(await resolveAnalyticsScope(makeRequest({ authorization: `Bearer ${token}` }), response, jwtConfig), null);
  assert.equal(state.statusCode, 401);
  assert.deepEqual(state.payload, {
    error: "Invalid embed session",
    code: "EMBED_TOKEN_EXPIRED"
  });
});
