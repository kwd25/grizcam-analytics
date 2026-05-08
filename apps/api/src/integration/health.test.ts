import assert from "node:assert/strict";
import { createServer } from "node:http";
import test from "node:test";
import express from "express";
import { appConfig } from "../config.js";
import { getAnalyticsScopeCapabilities } from "../queries/scope.js";
import { createIntegrationRouter } from "../routes/integration.js";
import { createSyncRouter } from "../routes/sync.js";
import { getIntegrationHealth, getSyncStatus } from "./health.js";

const secretValues = ["super-secret-jwt", "openrouter-secret", "cosmos-secret", "postgres://user:pass@example/db"];
const forbiddenKeys = ["EMBED_JWT_SECRET", "OPENROUTER_API_KEY", "COSMOS_KEY", "DATABASE_URL", "REPORTS_DATABASE_URL", "PGPASSWORD"];

const reportsHealth = {
  analyticsDatabase: "ok",
  analyticsDatabaseReadOnly: false,
  reportsDatabase: "ok" as const,
  reportsDatabaseReadOnly: false,
  reportsConnectionSource: "local_postgres" as const,
  reportsSchemaReady: true,
  reportsFailureReason: null,
  supportsEphemeralGeneration: true,
  openRouterConfigured: true,
  reportsEnabled: true
};

const okSyncWatermarkStatus = {
  watermarkTable: "ok" as const,
  watermarks: [
    {
      sourceName: "portal_events",
      lastValue: "2026-01-01T00:00:00Z",
      lastSyncedAt: "2026-01-01T00:01:00.000Z",
      metadata: { count: 1 }
    }
  ],
  latestWatermarkAt: "2026-01-01T00:01:00.000Z",
  database: { status: "ok" as const },
  error: null
};

const analyticsPool = {
  query: async () => ({
    rows: [{ read_only: "off" }]
  })
};

const readJson = async (response: Response) => response.json() as Promise<Record<string, unknown>>;

const withServer = async <T>(mount: (app: express.Express) => void, callback: (baseUrl: string) => Promise<T>) => {
  const app = express();
  mount(app);
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

test("schema capability helper reports organization scope support", () => {
  assert.deepEqual(getAnalyticsScopeCapabilities(), {
    organizationScopeSupported: true,
    eventOrganizationIdSupported: true,
    deviceOrganizationIdSupported: true,
    unsupportedRelationEmptyMacBehavior: "deny_all"
  });
});

test("sync status reports scaffold and watermark readiness", async () => {
  assert.deepEqual(
    await getSyncStatus(async () => okSyncWatermarkStatus),
    {
      ok: true,
      sync: {
        liveCosmosImplemented: false,
        fixtureDryRunAvailable: true,
        writeMode: "local_file_or_fixture_only",
        watermarkTable: "ok",
        watermarks: okSyncWatermarkStatus.watermarks,
        lastSync: "2026-01-01T00:01:00.000Z"
      },
      database: { status: "ok" }
    }
  );
});

test("integration health aggregates analytics, reports, embed, schema, and sync", async () => {
  const health = await getIntegrationHealth({
    analyticsPool,
    reportsHealth: async () => reportsHealth,
    syncWatermarkStatus: async () => okSyncWatermarkStatus,
    config: {
      ...appConfig,
      openRouterApiKey: secretValues[1],
      embed: {
        ...appConfig.embed,
        authMode: "jwt",
        jwtSecret: secretValues[0],
        tokenIssuer: "issuer",
        tokenAudience: "audience",
        allowedFrameAncestors: ["https://*.fly.dev"]
      }
    }
  });

  assert.equal(health.ok, true);
  assert.deepEqual(health.analyticsDatabase, { status: "ok", readOnly: false });
  assert.deepEqual(health.reports, {
    database: "ok",
    readOnly: false,
    schemaReady: true,
    enabled: true,
    openRouterConfigured: true
  });
  assert.deepEqual(health.embed, {
    authMode: "jwt",
    jwtConfigured: true,
    sessionEndpoint: "/api/embed/session"
  });
  assert.equal(health.schema.organizationScopeSupported, true);
  assert.equal(health.sync.watermarkTable, "ok");
});

test("integration health does not include secret-like keys or secret values", async () => {
  const health = await getIntegrationHealth({
    analyticsPool,
    reportsHealth: async () => reportsHealth,
    syncWatermarkStatus: async () => okSyncWatermarkStatus,
    config: {
      ...appConfig,
      openRouterApiKey: secretValues[1],
      embed: {
        ...appConfig.embed,
        authMode: "jwt",
        jwtSecret: secretValues[0],
        tokenIssuer: "issuer",
        tokenAudience: "audience"
      }
    }
  });
  const serialized = JSON.stringify(health);

  for (const value of secretValues) {
    assert.equal(serialized.includes(value), false);
  }

  for (const key of forbiddenKeys) {
    assert.equal(serialized.includes(key), false);
  }
});

test("integration health marks ok false when analytics database is unavailable", async () => {
  const health = await getIntegrationHealth({
    analyticsPool: {
      query: async () => {
        throw new Error("database unavailable");
      }
    },
    reportsHealth: async () => reportsHealth,
    syncWatermarkStatus: async () => okSyncWatermarkStatus
  });

  assert.equal(health.ok, false);
  assert.deepEqual(health.analyticsDatabase, { status: "unavailable", readOnly: null });
});

test("integration health includes warning when live Cosmos ingestion is not implemented", async () => {
  const health = await getIntegrationHealth({
    analyticsPool,
    reportsHealth: async () => reportsHealth,
    syncWatermarkStatus: async () => okSyncWatermarkStatus
  });

  assert.ok(health.warnings.includes("Live Cosmos ingestion is not implemented; fixture/file sync only."));
});

test("sync and integration routes mount at expected paths", async () => {
  await withServer(
    (app) => {
      app.use(
        "/api/sync",
        createSyncRouter({
          getStatus: async () => ({
            ok: true,
            sync: {
              liveCosmosImplemented: false,
              fixtureDryRunAvailable: true,
              writeMode: "local_file_or_fixture_only",
              watermarkTable: "missing",
              watermarks: [],
              lastSync: null
            },
            database: { status: "ok" }
          })
        })
      );
      app.use(
        "/api/integration",
        createIntegrationRouter({
          getHealth: async () => ({
            ok: true,
            analyticsDatabase: { status: "ok", readOnly: false },
            reports: { database: "ok", readOnly: false, schemaReady: true, enabled: true, openRouterConfigured: true },
            embed: { authMode: "jwt", jwtConfigured: true, sessionEndpoint: "/api/embed/session" },
            schema: {
              organizationScopeSupported: true,
              eventOrganizationIdSupported: true,
              deviceOrganizationIdSupported: true,
              syncWatermarksSupported: false
            },
            sync: {
              liveCosmosImplemented: false,
              fixtureDryRunAvailable: true,
              watermarkTable: "missing",
              latestWatermarkAt: null
            },
            deployment: {
              environment: "test",
              databaseConnectionSource: "local_postgres",
              reportsConnectionSource: "local_postgres"
            },
            warnings: []
          })
        })
      );
    },
    async (baseUrl) => {
      const syncResponse = await fetch(`${baseUrl}/api/sync/status`);
      const integrationResponse = await fetch(`${baseUrl}/api/integration/health`);

      assert.equal(syncResponse.status, 200);
      assert.equal((await readJson(syncResponse)).ok, true);
      assert.equal(integrationResponse.status, 200);
      assert.equal((await readJson(integrationResponse)).ok, true);
    }
  );
});
