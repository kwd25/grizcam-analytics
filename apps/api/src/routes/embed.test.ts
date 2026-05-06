import assert from "node:assert/strict";
import { createServer } from "node:http";
import test from "node:test";
import express from "express";
import { SignJWT } from "jose";
import type { EmbedAuthConfig } from "../embed/session.js";
import { createEmbedRouter } from "./embed.js";

const jwtSecret = "local_test_secret";
const jwtConfig: EmbedAuthConfig = {
  authMode: "jwt",
  jwtSecret,
  tokenIssuer: "grizcam_portal",
  tokenAudience: "grizcam_analytics"
};

const signEmbedToken = async (payload: Record<string, unknown>, config = jwtConfig) => {
  const jwt = new SignJWT(payload).setProtectedHeader({ alg: "HS256" });

  if (config.tokenIssuer) {
    jwt.setIssuer(config.tokenIssuer);
  }

  if (config.tokenAudience) {
    jwt.setAudience(config.tokenAudience);
  }

  return jwt.sign(new TextEncoder().encode(config.jwtSecret));
};

const withEmbedServer = async <T>(config: EmbedAuthConfig, callback: (baseUrl: string) => Promise<T>) => {
  const app = express();
  app.use("/api/embed", createEmbedRouter(config));

  const server = createServer(app);
  await new Promise<void>((resolve) => server.listen(0, resolve));

  try {
    const address = server.address();
    assert.ok(address && typeof address === "object");
    return await callback(`http://127.0.0.1:${address.port}`);
  } finally {
    await new Promise<void>((resolve, reject) => {
      server.close((error) => {
        if (error) {
          reject(error);
          return;
        }

        resolve();
      });
    });
  }
};

const readJson = async (response: Response) => response.json() as Promise<Record<string, unknown>>;

test("GET /api/embed/session returns disabled session without token", async () => {
  await withEmbedServer({ ...jwtConfig, authMode: "disabled", jwtSecret: "" }, async (baseUrl) => {
    const response = await fetch(`${baseUrl}/api/embed/session`);

    assert.equal(response.status, 200);
    assert.deepEqual(await readJson(response), {
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
});

test("GET /api/embed/session requires token in jwt mode", async () => {
  await withEmbedServer(jwtConfig, async (baseUrl) => {
    const response = await fetch(`${baseUrl}/api/embed/session`);

    assert.equal(response.status, 401);
    assert.deepEqual(await readJson(response), {
      error: "Invalid embed session",
      code: "EMBED_TOKEN_REQUIRED"
    });
  });
});

test("GET /api/embed/session rejects malformed token", async () => {
  await withEmbedServer(jwtConfig, async (baseUrl) => {
    const response = await fetch(`${baseUrl}/api/embed/session`, {
      headers: {
        authorization: "Bearer not-a-jwt"
      }
    });

    assert.equal(response.status, 401);
    assert.deepEqual(await readJson(response), {
      error: "Invalid embed session",
      code: "EMBED_TOKEN_INVALID"
    });
  });
});

test("GET /api/embed/session accepts valid authorization bearer token", async () => {
  const expiresAtSeconds = Math.floor(Date.now() / 1000) + 3600;
  const token = await signEmbedToken({
    orgId: "org_123",
    email: " user@example.com ",
    macs: [" F0F5BD77B104 ", "F0F5BD77B104"],
    exp: expiresAtSeconds
  });

  await withEmbedServer(jwtConfig, async (baseUrl) => {
    const response = await fetch(`${baseUrl}/api/embed/session`, {
      headers: {
        authorization: `Bearer ${token}`
      }
    });

    assert.equal(response.status, 200);
    assert.deepEqual(await readJson(response), {
      authenticated: true,
      mode: "jwt",
      orgId: "org_123",
      email: "user@example.com",
      name: null,
      role: null,
      macs: ["F0F5BD77B104"],
      expiresAt: new Date(expiresAtSeconds * 1000).toISOString()
    });
  });
});

test("GET /api/embed/session accepts valid query token fallback", async () => {
  const token = await signEmbedToken({
    orgId: "org_123",
    exp: Math.floor(Date.now() / 1000) + 3600
  });

  await withEmbedServer(jwtConfig, async (baseUrl) => {
    const response = await fetch(`${baseUrl}/api/embed/session?token=${encodeURIComponent(token)}`);

    assert.equal(response.status, 200);
    assert.equal((await readJson(response)).orgId, "org_123");
  });
});

test("GET /api/embed/session prefers authorization header over query token", async () => {
  const token = await signEmbedToken({
    orgId: "org_123",
    exp: Math.floor(Date.now() / 1000) + 3600
  });

  await withEmbedServer(jwtConfig, async (baseUrl) => {
    const response = await fetch(`${baseUrl}/api/embed/session?token=not-a-jwt`, {
      headers: {
        authorization: `Bearer ${token}`
      }
    });

    assert.equal(response.status, 200);
    assert.equal((await readJson(response)).orgId, "org_123");
  });
});

test("GET /api/embed/session returns safe misconfigured error without jwt secret", async () => {
  await withEmbedServer({ ...jwtConfig, jwtSecret: "" }, async (baseUrl) => {
    const response = await fetch(`${baseUrl}/api/embed/session?token=not-a-jwt`);

    assert.equal(response.status, 503);
    assert.deepEqual(await readJson(response), {
      error: "Embed authentication is not configured",
      code: "EMBED_AUTH_MISCONFIGURED"
    });
  });
});
