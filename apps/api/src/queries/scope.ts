import type { DashboardFilters } from "@grizcam/shared";
import type { AnalyticsScope } from "../embed/analyticsScope.js";
import { buildFilterClause } from "../utils/sql.js";

export type SqlFragment = {
  text: string;
  values: unknown[];
};

type ScopedRelationOptions = {
  alias?: string;
  supportsOrganizationId?: boolean;
};

type EffectiveMacs = {
  macs: string[];
  denied: boolean;
};

const unique = (items: string[]) => Array.from(new Set(items));

const withCondition = (fragment: SqlFragment, condition: string, value?: unknown): SqlFragment => {
  const values = value === undefined ? [...fragment.values] : [...fragment.values, value];
  const clause = value === undefined ? condition : condition.replace("?", `$${values.length}`);
  const existing = fragment.text.trim().replace(/^where\s+/i, "");

  return {
    text: existing ? `where ${existing} and ${clause}` : `where ${clause}`,
    values
  };
};

export const getEffectiveMacs = (requestedMacs: string[], scope: AnalyticsScope): EffectiveMacs => {
  const requested = unique(requestedMacs);

  if (scope.source !== "embed_token") {
    return { macs: requested, denied: false };
  }

  const allowed = unique(scope.macs);
  if (allowed.length === 0) {
    return { macs: requested, denied: false };
  }

  if (requested.length === 0) {
    return { macs: allowed, denied: false };
  }

  const allowedSet = new Set(allowed);
  const macs = requested.filter((mac) => allowedSet.has(mac));
  return { macs, denied: macs.length === 0 };
};

export const buildScopedFilterClause = (
  filters: DashboardFilters,
  scope: AnalyticsScope,
  options: ScopedRelationOptions = {}
): SqlFragment => {
  const alias = options.alias ?? "e";
  const effectiveMacs = getEffectiveMacs(filters.mac, scope);
  const scopedFilters = {
    ...filters,
    mac: effectiveMacs.macs
  };
  let fragment = buildFilterClause(scopedFilters, alias);

  if (effectiveMacs.denied) {
    fragment = withCondition(fragment, "1 = 0");
  }

  if (scope.source === "embed_token" && scope.organizationId && options.supportsOrganizationId) {
    fragment = withCondition(fragment, `${alias}.organization_id = ?`, scope.organizationId);
  }

  return fragment;
};

export const buildScopeOnlyWhere = (scope: AnalyticsScope, options: ScopedRelationOptions = {}): SqlFragment => {
  const alias = options.alias ?? "e";
  let fragment: SqlFragment = { text: "", values: [] };
  const effectiveMacs = getEffectiveMacs([], scope);

  if (effectiveMacs.macs.length > 0) {
    fragment = withCondition(fragment, `${alias}.mac = ANY(?::text[])`, effectiveMacs.macs);
  }

  if (scope.source === "embed_token" && scope.organizationId && options.supportsOrganizationId) {
    fragment = withCondition(fragment, `${alias}.organization_id = ?`, scope.organizationId);
  }

  return fragment;
};
