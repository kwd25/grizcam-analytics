import assert from "node:assert/strict";
import test from "node:test";
import type { DashboardFilters, EventQuery } from "@grizcam/shared";
import { STANDALONE_ANALYTICS_SCOPE, type AnalyticsScope } from "../embed/analyticsScope.js";
import { buildScopedFilterClause, buildScopeOnlyWhere, getEffectiveMacs } from "./scope.js";

const baseFilters: DashboardFilters = {
  camera_name: [],
  mac: [],
  start_date: undefined,
  end_date: undefined,
  time_of_day_bucket: [],
  subject_category: [],
  subject_class: [],
  q: "",
  min_lux: undefined,
  max_lux: undefined,
  min_temperature: undefined,
  max_temperature: undefined,
  min_heat_level: undefined,
  max_heat_level: undefined
};

const embedScope = (macs: string[] = ["A", "B"], organizationId = "org_123"): AnalyticsScope => ({
  source: "embed_token",
  organizationId,
  macs,
  email: null,
  role: null
});

test("standalone scope does not add predicates without filters", () => {
  const filter = buildScopedFilterClause(baseFilters, STANDALONE_ANALYTICS_SCOPE);
  assert.equal(filter.text, "");
  assert.deepEqual(filter.values, []);
});

test("standalone scope preserves requested mac filters", () => {
  const filter = buildScopedFilterClause({ ...baseFilters, mac: ["A"] }, STANDALONE_ANALYTICS_SCOPE);
  assert.match(filter.text, /e\.mac = ANY\(\$1::text\[\]\)/);
  assert.deepEqual(filter.values, [["A"]]);
});

test("embed scope defaults to token macs when no mac filter is requested", () => {
  assert.deepEqual(getEffectiveMacs([], embedScope()).macs, ["A", "B"]);
  const filter = buildScopedFilterClause(baseFilters, embedScope());
  assert.match(filter.text, /e\.mac = ANY\(\$1::text\[\]\)/);
  assert.deepEqual(filter.values, [["A", "B"]]);
});

test("embed scope narrows requested macs by intersection", () => {
  assert.deepEqual(getEffectiveMacs(["A"], embedScope()).macs, ["A"]);
  assert.deepEqual(getEffectiveMacs(["A", "C"], embedScope()).macs, ["A"]);

  const filter = buildScopedFilterClause({ ...baseFilters, mac: ["A", "C"] }, embedScope());
  assert.match(filter.text, /e\.mac = ANY\(\$1::text\[\]\)/);
  assert.deepEqual(filter.values, [["A"]]);
});

test("embed scope adds a zero-row predicate when requested macs are unauthorized", () => {
  const effective = getEffectiveMacs(["C"], embedScope());
  assert.deepEqual(effective, { macs: [], denied: true });

  const filter = buildScopedFilterClause({ ...baseFilters, mac: ["C"] }, embedScope());
  assert.match(filter.text, /where 1 = 0/);
  assert.deepEqual(filter.values, []);
});

test("embed token with empty macs and unsupported organization scope produces a zero-row predicate", () => {
  const filter = buildScopedFilterClause(baseFilters, embedScope([]), {
    supportsOrganizationId: false
  });

  assert.match(filter.text, /where 1 = 0/);
  assert.doesNotMatch(filter.text, /organization_id/);
  assert.deepEqual(filter.values, []);
});

test("embed token with empty macs and supported organization scope emits an organization-only predicate", () => {
  const filter = buildScopedFilterClause(baseFilters, embedScope([], "org_123"), {
    supportsOrganizationId: true
  });

  assert.doesNotMatch(filter.text, /1 = 0/);
  assert.doesNotMatch(filter.text, /mac = ANY/);
  assert.match(filter.text, /e\.organization_id = \$1/);
  assert.deepEqual(filter.values, ["org_123"]);
});

test("embed token with macs and supported organization scope emits mac and organization predicates", () => {
  const filter = buildScopedFilterClause(baseFilters, embedScope(["A", "B"], "org_123"), {
    supportsOrganizationId: true
  });

  assert.match(filter.text, /e\.mac = ANY\(\$1::text\[\]\)/);
  assert.match(filter.text, /e\.organization_id = \$2/);
  assert.deepEqual(filter.values, [["A", "B"], "org_123"]);
});

test("scope values are parameterized and compose with date, q, and telemetry filters", () => {
  const filter = buildScopedFilterClause(
    {
      ...baseFilters,
      start_date: "2025-01-01",
      q: "bear",
      min_lux: 10
    },
    embedScope(["MAC_A"])
  );

  assert.match(filter.text, /e\.mac = ANY\(\$1::text\[\]\)/);
  assert.match(filter.text, /::date >= \$2::date/);
  assert.match(filter.text, /ILIKE \$3/);
  assert.match(filter.text, /e\.lux >= \$4/);
  assert.doesNotMatch(filter.text, /MAC_A|bear/);
  assert.deepEqual(filter.values, [["MAC_A"], "2025-01-01", "%bear%", 10]);
});

test("zero-row predicate does not shift parameter indexes for existing filters", () => {
  const filter = buildScopedFilterClause(
    {
      ...baseFilters,
      start_date: "2025-01-01",
      q: "bear",
      min_lux: 10
    },
    embedScope([])
  );

  assert.match(filter.text, /::date >= \$1::date/);
  assert.match(filter.text, /ILIKE \$2/);
  assert.match(filter.text, /e\.lux >= \$3/);
  assert.match(filter.text, /1 = 0/);
  assert.deepEqual(filter.values, ["2025-01-01", "%bear%", 10]);
});

test("scope-only where supports mac and optional organization predicates", () => {
  const filter = buildScopeOnlyWhere(embedScope(["A", "B"]), {
    alias: "d",
    supportsOrganizationId: true
  });

  assert.match(filter.text, /d\.mac = ANY\(\$1::text\[\]\)/);
  assert.match(filter.text, /d\.organization_id = \$2/);
  assert.deepEqual(filter.values, [["A", "B"], "org_123"]);
});

test("scope-only where denies empty mac embed scope when organization scope is unsupported", () => {
  const filter = buildScopeOnlyWhere(embedScope([]), {
    alias: "d",
    supportsOrganizationId: false
  });

  assert.equal(filter.text, "where 1 = 0");
  assert.deepEqual(filter.values, []);
});

test("scope-only where allows empty mac embed scope when organization scope is supported", () => {
  const filter = buildScopeOnlyWhere(embedScope([], "org_123"), {
    alias: "d",
    supportsOrganizationId: true
  });

  assert.equal(filter.text, "where d.organization_id = $1");
  assert.deepEqual(filter.values, ["org_123"]);
});

type QueryCall = {
  sql: string;
  values: unknown[];
};

const mockPool = {
  calls: [] as QueryCall[],
  on() {
    return this;
  },
  async query(sql: string, values: unknown[] = []) {
    this.calls.push({ sql, values });
    if (sql.includes("count(*)::int as total")) {
      return { rows: [{ total: 0 }] };
    }
    if (sql.includes("min(lux)::int as min_lux")) {
      return {
        rows: [
          {
            min_lux: null,
            max_lux: null,
            min_temperature: null,
            max_temperature: null,
            min_heat_level: null,
            max_heat_level: null
          }
        ]
      };
    }
    return { rows: [] };
  }
};

(globalThis as unknown as { __grizcamPool?: unknown }).__grizcamPool = mockPool;

const dashboardModule = await import("./dashboard.js");

const baseEventQuery: EventQuery = {
  ...baseFilters,
  page: 1,
  page_size: 25,
  sort_by: "timestamp",
  sort_dir: "desc"
};

test("getEvents applies the same embed mac scope to count and row queries", async () => {
  mockPool.calls = [];

  await dashboardModule.getEvents(baseEventQuery, embedScope(["A"]));

  assert.equal(mockPool.calls.length, 2);
  assert.match(mockPool.calls[0].sql, /e\.mac = ANY\(\$1::text\[\]\)/);
  assert.match(mockPool.calls[0].sql, /e\.organization_id = \$2/);
  assert.match(mockPool.calls[1].sql, /e\.mac = ANY\(\$1::text\[\]\)/);
  assert.match(mockPool.calls[1].sql, /e\.organization_id = \$2/);
  assert.deepEqual(mockPool.calls[0].values, [["A"], "org_123"]);
  assert.deepEqual(mockPool.calls[1].values.slice(0, -2), [["A"], "org_123"]);
});

test("getEvents applies organization-only scope for empty mac embed scope", async () => {
  mockPool.calls = [];

  await dashboardModule.getEvents(baseEventQuery, embedScope([]));

  assert.equal(mockPool.calls.length, 2);
  assert.doesNotMatch(mockPool.calls[0].sql, /1 = 0/);
  assert.doesNotMatch(mockPool.calls[1].sql, /1 = 0/);
  assert.doesNotMatch(mockPool.calls[0].sql, /mac = ANY/);
  assert.match(mockPool.calls[0].sql, /where e\.organization_id = \$1/);
  assert.match(mockPool.calls[1].sql, /where e\.organization_id = \$1/);
  assert.deepEqual(mockPool.calls[0].values, ["org_123"]);
  assert.deepEqual(mockPool.calls[1].values.slice(0, -2), ["org_123"]);
});

test("getFilterOptions scopes device and event-derived option queries", async () => {
  mockPool.calls = [];

  await dashboardModule.getFilterOptions(embedScope(["A", "B"]));

  assert.equal(mockPool.calls.length, 6);
  assert.match(mockPool.calls[0].sql, /from dim_devices d where d\.mac = ANY\(\$1::text\[\]\) and d\.organization_id = \$2/);
  assert.match(mockPool.calls[2].sql, /from events e where e\.mac = ANY\(\$1::text\[\]\) and e\.organization_id = \$2/);
  assert.match(mockPool.calls[5].sql, /from events e\s+where e\.mac = ANY\(\$1::text\[\]\) and e\.organization_id = \$2/);
  assert.deepEqual(mockPool.calls[0].values, [["A", "B"], "org_123"]);
  assert.deepEqual(mockPool.calls[2].values, [["A", "B"], "org_123"]);
});

test("getFilterOptions applies organization-only scope for empty mac embed scope", async () => {
  mockPool.calls = [];

  await dashboardModule.getFilterOptions(embedScope([]));

  assert.equal(mockPool.calls.length, 6);
  assert.match(mockPool.calls[0].sql, /from dim_devices d where d\.organization_id = \$1/);
  assert.match(mockPool.calls[1].sql, /from dim_devices d where d\.organization_id = \$1/);
  assert.match(mockPool.calls[2].sql, /from events e where e\.organization_id = \$1 and/);
  assert.match(mockPool.calls[5].sql, /from events e\s+where e\.organization_id = \$1/);
  assert.deepEqual(mockPool.calls[0].values, ["org_123"]);
  assert.deepEqual(mockPool.calls[2].values, ["org_123"]);
});
