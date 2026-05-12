import assert from "node:assert/strict";
import test from "node:test";
import { buildReportFilterKey, type DashboardFilters } from "@grizcam/shared";
import { STANDALONE_ANALYTICS_SCOPE, type AnalyticsScope } from "../embed/analyticsScope.js";
import { buildReportScopeIdentity, buildReportScopeKey, buildScopedReportFilterKey } from "./scopeKey.js";

const filters: DashboardFilters = {
  camera_name: ["South Ridge", "North Ridge"],
  mac: ["requested-b", "requested-a"],
  start_date: "2025-01-01",
  end_date: "2025-01-31",
  time_of_day_bucket: [],
  subject_category: [],
  subject_class: [],
  q: "  movement  ",
  min_lux: undefined,
  max_lux: undefined,
  min_temperature: undefined,
  max_temperature: undefined,
  min_heat_level: undefined,
  max_heat_level: undefined
};

const embedScope = (overrides: Partial<AnalyticsScope> = {}): AnalyticsScope => ({
  source: "embed_token",
  organizationId: "org_123",
  macs: ["B", "A", "A"],
  email: "operator@example.com",
  role: "viewer",
  ...overrides
});

test("standalone report scope key is deterministic", () => {
  assert.deepEqual(buildReportScopeIdentity(STANDALONE_ANALYTICS_SCOPE), {
    source: "standalone",
    organizationId: null,
    macs: []
  });
  assert.equal(buildReportScopeKey(STANDALONE_ANALYTICS_SCOPE), buildReportScopeKey({ ...STANDALONE_ANALYTICS_SCOPE }));
});

test("embed report scope identity sorts and dedupes token macs", () => {
  assert.deepEqual(buildReportScopeIdentity(embedScope()), {
    source: "embed_token",
    organizationId: "org_123",
    macs: ["A", "B"]
  });
});

test("same filters with different scopes produce different scoped filter keys", () => {
  const standaloneKey = buildScopedReportFilterKey(filters, STANDALONE_ANALYTICS_SCOPE);
  const embedKey = buildScopedReportFilterKey(filters, embedScope());

  assert.notEqual(standaloneKey, embedKey);
  assert.ok(standaloneKey.startsWith(`${buildReportFilterKey(filters)}|scope:`));
  assert.ok(embedKey.startsWith(`${buildReportFilterKey(filters)}|scope:`));
});

test("same embed scope with mac order changed produces same scoped filter key", () => {
  assert.equal(
    buildScopedReportFilterKey(filters, embedScope({ macs: ["B", "A"] })),
    buildScopedReportFilterKey(filters, embedScope({ macs: ["A", "B", "A"] }))
  );
});

test("embed org and token mac access boundaries are part of scoped filter identity", () => {
  assert.notEqual(
    buildScopedReportFilterKey(filters, embedScope({ organizationId: "org_123", macs: ["A", "B"] })),
    buildScopedReportFilterKey(filters, embedScope({ organizationId: "org_456", macs: ["A", "B"] }))
  );
  assert.notEqual(
    buildScopedReportFilterKey(filters, embedScope({ organizationId: "org_123", macs: ["A", "B"] })),
    buildScopedReportFilterKey(filters, embedScope({ organizationId: "org_123", macs: ["C", "D"] }))
  );
});
