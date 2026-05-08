import { appConfig } from "../config.js";
import { pool } from "../db.js";
import { getAnalyticsScopeCapabilities } from "../queries/scope.js";
import { getReportsHealth } from "../reports/service.js";
import { buildEmbedHealth } from "../routes/embed.js";
import { getSyncWatermarkStatus, type SyncWatermarkStatus } from "../sync/watermark.js";

type HealthQueryResult = {
  rows: { read_only?: string }[];
};

type HealthQueryable = {
  query: (text: string, values?: unknown[]) => Promise<HealthQueryResult>;
};

type AnalyticsDatabaseHealth = {
  status: "ok" | "unavailable";
  readOnly: boolean | null;
  message?: string;
};

type ReportsHealth = Awaited<ReturnType<typeof getReportsHealth>>;

type IntegrationHealthDependencies = {
  analyticsPool?: HealthQueryable;
  reportsHealth?: () => Promise<ReportsHealth>;
  syncWatermarkStatus?: () => Promise<SyncWatermarkStatus>;
  config?: typeof appConfig;
};

const LIVE_COSMOS_IMPLEMENTED = false;
const FIXTURE_DRY_RUN_AVAILABLE = true;
const SYNC_WRITE_MODE = "local_file_or_fixture_only" as const;

const safeErrorMessage = (error: unknown) => (error instanceof Error ? error.message : "Unknown database error");

export const getAnalyticsDatabaseHealth = async (analyticsPool: HealthQueryable = pool): Promise<AnalyticsDatabaseHealth> => {
  try {
    const result = await analyticsPool.query("select current_setting('transaction_read_only') as read_only");

    return {
      status: "ok",
      readOnly: String(result.rows[0]?.read_only) === "on"
    };
  } catch (error) {
    return {
      status: "unavailable",
      readOnly: null,
      message: safeErrorMessage(error)
    };
  }
};

export const getSyncStatus = async (
  syncWatermarkStatus: () => Promise<SyncWatermarkStatus> = () => getSyncWatermarkStatus(pool)
) => {
  const watermarkStatus = await syncWatermarkStatus();

  return {
    ok: watermarkStatus.database.status === "ok",
    sync: {
      liveCosmosImplemented: LIVE_COSMOS_IMPLEMENTED,
      fixtureDryRunAvailable: FIXTURE_DRY_RUN_AVAILABLE,
      writeMode: SYNC_WRITE_MODE,
      watermarkTable: watermarkStatus.watermarkTable,
      watermarks: watermarkStatus.watermarks,
      lastSync: watermarkStatus.latestWatermarkAt
    },
    database: watermarkStatus.database
  };
};

export const getIntegrationHealth = async (dependencies: IntegrationHealthDependencies = {}) => {
  const config = dependencies.config ?? appConfig;
  const [analyticsDatabase, reportsHealth, syncStatus] = await Promise.all([
    getAnalyticsDatabaseHealth(dependencies.analyticsPool ?? pool),
    (dependencies.reportsHealth ?? getReportsHealth)(),
    getSyncStatus(dependencies.syncWatermarkStatus)
  ]);
  const embed = buildEmbedHealth(config.embed);
  const schemaCapabilities = getAnalyticsScopeCapabilities();
  const warnings: string[] = [];

  if (!LIVE_COSMOS_IMPLEMENTED) {
    warnings.push("Live Cosmos ingestion is not implemented; fixture/file sync only.");
  }

  if (syncStatus.sync.watermarkTable === "missing") {
    warnings.push("sync_watermarks table is missing; apply migration 003 before write-mode sync.");
  } else if (syncStatus.sync.watermarkTable === "unavailable") {
    warnings.push("Sync watermark status is unavailable from the analytics database.");
  }

  if (reportsHealth.reportsDatabase === "disabled") {
    warnings.push("Reports storage is disabled; manual generation may still work if OpenRouter is configured.");
  } else if (reportsHealth.reportsDatabase === "unavailable" || !reportsHealth.reportsSchemaReady) {
    warnings.push("Reports storage is not fully ready; report cache behavior may be limited.");
  }

  if (embed.embed.authMode === "jwt" && !embed.embed.jwtConfigured) {
    warnings.push("Embed JWT auth is enabled but EMBED_JWT_SECRET is not configured.");
  }

  return {
    ok: analyticsDatabase.status === "ok" && embed.ok,
    analyticsDatabase: {
      status: analyticsDatabase.status,
      readOnly: analyticsDatabase.readOnly
    },
    reports: {
      database: reportsHealth.reportsDatabase,
      readOnly: reportsHealth.reportsDatabaseReadOnly,
      schemaReady: reportsHealth.reportsSchemaReady,
      enabled: reportsHealth.reportsEnabled,
      openRouterConfigured: reportsHealth.openRouterConfigured
    },
    embed: {
      authMode: embed.embed.authMode,
      jwtConfigured: embed.embed.jwtConfigured,
      sessionEndpoint: embed.embed.sessionEndpoint
    },
    schema: {
      organizationScopeSupported: schemaCapabilities.organizationScopeSupported,
      eventOrganizationIdSupported: schemaCapabilities.eventOrganizationIdSupported,
      deviceOrganizationIdSupported: schemaCapabilities.deviceOrganizationIdSupported,
      syncWatermarksSupported: syncStatus.sync.watermarkTable === "ok"
    },
    sync: {
      liveCosmosImplemented: syncStatus.sync.liveCosmosImplemented,
      fixtureDryRunAvailable: syncStatus.sync.fixtureDryRunAvailable,
      watermarkTable: syncStatus.sync.watermarkTable,
      latestWatermarkAt: syncStatus.sync.lastSync
    },
    deployment: {
      environment: config.environment,
      databaseConnectionSource: config.databaseConnectionSource,
      reportsConnectionSource: config.reportsConnectionSource
    },
    warnings
  };
};
