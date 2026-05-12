import { createHash } from "node:crypto";
import type { ReportSnapshotSummary } from "@grizcam/shared";
import { buildReportFilterKey, normalizeReportFilters } from "@grizcam/shared";
import type { ReportScopeIdentity } from "./scopeKey.js";

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

export const hashReportSnapshot = (
  snapshot: ReportSnapshotSummary,
  promptVersion: string,
  model: string,
  scopeIdentity: ReportScopeIdentity
) =>
  createHash("sha256")
    .update(
      stableSerialize({
        snapshot: {
          ...snapshot,
          filters: normalizeReportFilters(snapshot.filters),
          filterKey: buildReportFilterKey(snapshot.filters)
        },
        promptVersion,
        model,
        scopeIdentity
      })
    )
    .digest("hex");
