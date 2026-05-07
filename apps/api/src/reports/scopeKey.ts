import { createHash } from "node:crypto";
import type { DashboardFilters } from "@grizcam/shared";
import { buildReportFilterKey } from "@grizcam/shared";
import type { AnalyticsScope } from "../embed/analyticsScope.js";

export type ReportScopeIdentity = {
  source: "standalone" | "embed_token";
  organizationId: string | null;
  macs: string[];
};

const stableSerialize = (value: unknown): string => {
  if (Array.isArray(value)) {
    return `[${value.map((item) => stableSerialize(item)).join(",")}]`;
  }

  if (value && typeof value === "object") {
    return `{${Object.entries(value as Record<string, unknown>)
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([key, child]) => `${JSON.stringify(key)}:${stableSerialize(child)}`)
      .join(",")}}`;
  }

  return JSON.stringify(value);
};

const uniqueSorted = (items: string[]) => Array.from(new Set(items)).sort();

export const buildReportScopeIdentity = (scope: AnalyticsScope): ReportScopeIdentity => {
  if (scope.source !== "embed_token") {
    return {
      source: "standalone",
      organizationId: null,
      macs: []
    };
  }

  return {
    source: "embed_token",
    organizationId: scope.organizationId,
    macs: uniqueSorted(scope.macs)
  };
};

export const buildReportScopeKey = (scope: AnalyticsScope) => stableSerialize(buildReportScopeIdentity(scope));

export const buildScopedReportFilterKey = (filters: DashboardFilters, scope: AnalyticsScope) => {
  const baseFilterKey = buildReportFilterKey(filters);
  const scopeDigest = createHash("sha256").update(buildReportScopeKey(scope)).digest("hex").slice(0, 16);

  return `${baseFilterKey}|scope:${scopeDigest}`;
};
