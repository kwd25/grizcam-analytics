import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { AppShell } from "../components/AppShell";
import { FilterBar } from "../components/FilterBar";
import { SectionCard } from "../components/SectionCard";
import { api } from "../lib/api";
import { axisStroke, BRAND, gridStroke, tooltipStyle } from "../lib/chartColors";
import { appEnv } from "../lib/env";
import { classNames, formatNumber, formatSignedNumber, titleCase } from "../lib/utils";
import { useDashboardFilters } from "../hooks/useDashboardFilters";
import { useReportPrefetch } from "../hooks/useReportPrefetch";

const QueryState = ({ error }: { error?: Error | null }) => (
  <div className="panel rounded-lg border border-white/10 bg-white/[0.03] px-4 py-10 text-center">
    <div className="text-sm font-medium text-white">{error ? "Section unavailable" : "Loading section"}</div>
    <div className="mt-2 text-sm text-zinc-400">
      {error ? "Unexpected response. Retry shortly." : "Scoring predictions, novelty, and category shifts."}
    </div>
  </div>
);

const insightToneClasses = {
  info: "border-white/15 bg-white/10 text-zinc-100",
  positive: "border-white/15 bg-white/10 text-zinc-100",
  warning: "border-stone-400/25 bg-stone-400/10 text-stone-100",
  alert: "border-red-300/20 bg-red-300/10 text-red-100"
} as const;

const shiftCellClass = (value: number) => {
  if (value >= 15) {
    return "bg-white/10 text-zinc-100";
  }
  if (value >= 5) {
    return "bg-white/10 text-zinc-100";
  }
  if (value <= -15) {
    return "bg-red-300/10 text-red-100";
  }
  if (value <= -5) {
    return "bg-red-300/10 text-red-100";
  }
  return "bg-white/5 text-zinc-300";
};

const residualCellClass = (value: number) => {
  if (value >= 40) {
    return "bg-white/10 text-zinc-100";
  }
  if (value >= 15) {
    return "bg-white/10 text-zinc-100";
  }
  if (value <= -40) {
    return "bg-red-300/10 text-red-100";
  }
  if (value <= -15) {
    return "bg-red-300/10 text-red-100";
  }
  return "bg-white/5 text-zinc-300";
};

export const AdvancedPage = () => {
  const { filters, patchFilters, resetFilters } = useDashboardFilters();
  useReportPrefetch(filters);
  const stableFilters = useMemo(() => filters, [filters]);
  const optionsQuery = useQuery({ queryKey: ["filter-options"], queryFn: api.filterOptions });
  const analyticsQuery = useQuery({ queryKey: ["analytics-lab", stableFilters], queryFn: () => api.analyticsLab(stableFilters) });

  const analytics = analyticsQuery.data;
  const forecastLeaderNames = analytics?.cameraForecastLeaders.slice(0, 5).map((item) => item.cameraName) ?? [];
  const forecastDateColumns = Array.from(new Set(
    analytics?.cameraForecast.filter((item) => forecastLeaderNames.includes(item.cameraName)).map((item) => item.date) ?? []
  )).sort();
  const forecastResidualLookup = new Map(
    analytics?.cameraForecast
      .filter((item) => forecastLeaderNames.includes(item.cameraName))
      .map((item) => [`${item.cameraName}|||${item.date}`, item]) ?? []
  );
  const shiftCameraRows = Array.from(new Set(analytics?.categoryShiftMatrix.slice(0, 24).map((item) => item.cameraName) ?? []));
  const shiftColumns = Array.from(new Set(analytics?.categoryShiftMatrix.slice(0, 24).map((item) => item.category) ?? []));
  const shiftLookup = new Map(
    analytics?.categoryShiftMatrix.slice(0, 24).map((item) => [`${item.cameraName}|||${item.category}`, item]) ?? []
  );
  const noveltyVolumeData = analytics?.noveltyTimelineDaily ?? [];

  return (
    <AppShell
      title="Advanced"
      subtitle="Camera forecasting, novelty detection, category shift."
      badge={`${appEnv.demoLabel} • Advanced views`}
      aside={<FilterBar filters={filters} options={optionsQuery.data} onChange={patchFilters} onReset={resetFilters} />}
    >
      {analytics ? (
        <>
          <div className="grid gap-4 xl:grid-cols-3">
            {analytics.advancedInsights.map((item) => (
              <SectionCard key={item.title} title={item.title} className={classNames("border", insightToneClasses[item.tone])}>
                <p className="text-sm leading-6 text-inherit/90">{item.detail}</p>
              </SectionCard>
            ))}
          </div>

          <div className="grid gap-4 xl:grid-cols-[1.15fr_0.85fr]">
            <SectionCard title="Forecast Residual Heatmap" subtitle="Residual percent by camera and date. Above- and below-expectation activity.">
              <div className="overflow-auto">
                <div className="grid min-w-max gap-2 text-xs" style={{ gridTemplateColumns: `220px repeat(${forecastDateColumns.length || 1}, minmax(74px, 1fr))` }}>
                  <div />
                  {forecastDateColumns.map((date) => (
                    <div key={date} className="px-1 text-center text-zinc-400">{date.slice(5)}</div>
                  ))}
                  {forecastLeaderNames.map((cameraName) => (
                    <div key={cameraName} className="contents">
                      <div className="pr-3 text-sm font-medium text-zinc-300">{cameraName}</div>
                      {forecastDateColumns.map((date) => {
                        const item = forecastResidualLookup.get(`${cameraName}|||${date}`);
                        return (
                          <div
                            key={`${cameraName}-${date}`}
                            className={classNames("flex h-12 items-center justify-center rounded-xl border border-white/5 font-medium", residualCellClass(item?.residualPct ?? 0))}
                            title={
                              item
                                ? `${cameraName} ${date}: actual ${formatNumber(item.actual)}, expected ${formatNumber(item.expected, 1)}, delta ${formatSignedNumber(item.delta, 1)}, residual ${formatSignedNumber(item.residualPct, 1)}%`
                                : `${cameraName} ${date}: no forecast signal`
                            }
                          >
                            {item ? `${formatSignedNumber(item.residualPct, 0)}%` : ""}
                          </div>
                        );
                      })}
                    </div>
                  ))}
                </div>
              </div>
            </SectionCard>

            <SectionCard title="Camera Forecast Leaderboard" subtitle="Largest current-window misses ranked by deviation from each camera's trailing 7-day expectation.">
              <div className="overflow-auto rounded-2xl border border-white/10">
                <table className="min-w-full text-left text-sm">
                  <thead className="bg-neutral-950/90 text-zinc-400">
                    <tr>
                      <th className="px-3 py-3">Camera</th>
                      <th className="px-3 py-3">Actual</th>
                      <th className="px-3 py-3">Expected</th>
                      <th className="px-3 py-3">Delta</th>
                      <th className="px-3 py-3">Residual</th>
                    </tr>
                  </thead>
                  <tbody>
                    {analytics.cameraForecastLeaders.map((row) => (
                      <tr key={row.cameraName} className="border-t border-white/5 text-zinc-200">
                        <td className="px-3 py-3 font-medium">{row.cameraName}</td>
                        <td className="px-3 py-3">{formatNumber(row.actual)}</td>
                        <td className="px-3 py-3">{formatNumber(row.expected, 1)}</td>
                        <td className={`px-3 py-3 ${row.delta >= 0 ? "text-zinc-100" : "text-red-200"}`}>{formatSignedNumber(row.delta, 1)}</td>
                        <td className={`px-3 py-3 ${row.residualPct >= 0 ? "text-zinc-100" : "text-red-200"}`}>{formatSignedNumber(row.residualPct, 1)}%</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </SectionCard>
          </div>

          <div className="grid gap-4 xl:grid-cols-1">
            <SectionCard title="Novel Events" subtitle="Rare camera-category-time combinations, weighted by uncommonness.">
              <div className="overflow-auto rounded-2xl border border-white/10">
                <table className="min-w-full text-left text-sm">
                  <thead className="bg-neutral-950/90 text-zinc-400">
                    <tr>
                      <th className="px-3 py-3">Pattern</th>
                      <th className="px-3 py-3">Novelty</th>
                      <th className="px-3 py-3">Recent</th>
                      <th className="px-3 py-3">Baseline</th>
                      <th className="px-3 py-3">Shift</th>
                    </tr>
                  </thead>
                  <tbody>
                    {analytics.novelEvents.map((row) => (
                      <tr key={`${row.cameraName}-${row.category}-${row.hour}`} className="border-t border-white/5 text-zinc-200">
                        <td className="px-3 py-3">
                          <div className="font-medium">{row.cameraName}</div>
                          <div className="mt-1 text-xs text-zinc-400">{titleCase(row.category)} at {String(row.hour).padStart(2, "0")}:00</div>
                        </td>
                        <td className="px-3 py-3 text-stone-200">{formatNumber(row.noveltyScore, 1)}</td>
                        <td className="px-3 py-3">{formatNumber(row.currentCount)}</td>
                        <td className="px-3 py-3">{formatNumber(row.baselineDailyAvg, 1)}/day</td>
                        <td className={`px-3 py-3 ${row.shiftPct >= 0 ? "text-zinc-100" : "text-red-200"}`}>{formatSignedNumber(row.shiftPct, 1)} pts</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="mt-4 space-y-2">
                {analytics.novelEvents.slice(0, 3).map((row) => (
                  <div key={`${row.cameraName}-${row.category}-${row.hour}-detail`} className="rounded-2xl bg-white/5 px-4 py-3 text-sm text-zinc-300">
                    {row.narrative}
                  </div>
                ))}
              </div>
            </SectionCard>
          </div>

          <div className="grid gap-4 xl:grid-cols-1">
            <SectionCard title="Novelty Volume Timeline" subtitle="Daily count of novelty-qualified patterns.">
              <div className="h-80">
                <ResponsiveContainer>
                  <BarChart data={noveltyVolumeData}>
                    <CartesianGrid stroke={gridStroke} vertical={false} />
                    <XAxis dataKey="date" stroke={axisStroke} minTickGap={32} />
                    <YAxis stroke={axisStroke} />
                    <Tooltip
                      contentStyle={tooltipStyle}
                      formatter={(value: unknown) => (typeof value === "number" ? formatNumber(value, 0) : String(value ?? ""))}
                      labelFormatter={(_, payload) => {
                        const item = payload?.[0]?.payload;
                        return item ? `${item.date} • ${item.topDriver ?? "No dominant driver"} • ${item.dominantCategory ? titleCase(item.dominantCategory) : "No dominant category"}` : "";
                      }}
                    />
                    <Bar dataKey="noveltyCount" fill={BRAND.taupe} radius={[8, 8, 0, 0]} name="Novelty count" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </SectionCard>
          </div>

          <div className="grid gap-4 xl:grid-cols-1">
            <SectionCard title="Category Shift Matrix" subtitle="Camera-category share movement vs baseline. Over- and under-indexing.">
              <div className="overflow-auto">
                <div className="grid min-w-max gap-2 text-xs" style={{ gridTemplateColumns: `220px repeat(${shiftColumns.length || 1}, minmax(92px, 1fr))` }}>
                  <div />
                  {shiftColumns.map((column) => (
                    <div key={column} className="px-1 text-center text-zinc-400">{titleCase(column)}</div>
                  ))}
                  {shiftCameraRows.map((cameraName) => (
                    <div key={cameraName} className="contents">
                      <div className="pr-3 text-sm font-medium text-zinc-300">{cameraName}</div>
                      {shiftColumns.map((column) => {
                        const item = shiftLookup.get(`${cameraName}|||${column}`);
                        return (
                          <div
                            key={`${cameraName}-${column}`}
                            className={classNames("flex h-12 items-center justify-center rounded-xl border border-white/5 font-medium", shiftCellClass(item?.shiftPct ?? 0))}
                            title={
                              item
                                ? `${cameraName} ${column}: recent ${formatNumber(item.recentSharePct, 1)}%, baseline ${formatNumber(item.baselineSharePct, 1)}%`
                                : `${cameraName} ${column}: no material shift`
                            }
                          >
                            {item ? `${formatSignedNumber(item.shiftPct, 1)}p` : ""}
                          </div>
                        );
                      })}
                    </div>
                  ))}
                </div>
              </div>
            </SectionCard>
          </div>
        </>
      ) : (
        <QueryState error={analyticsQuery.error as Error | null} />
      )}
    </AppShell>
  );
};
