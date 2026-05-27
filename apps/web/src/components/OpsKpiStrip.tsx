import type { OverviewResponse } from "@grizcam/shared";
import { formatCompactNumber, formatDurationShort, formatPercent } from "../lib/utils";

const MetricCard = ({ label, value, tone = "text-white" }: { label: string; value: string; tone?: string }) => (
  <div className="panel rounded-lg p-4">
    <div className="text-xs uppercase tracking-[0.18em] text-zinc-400">{label}</div>
    <div className={`mt-3 text-2xl font-semibold ${tone}`}>{value}</div>
  </div>
);

export const OpsKpiStrip = ({ data }: { data: OverviewResponse }) => {
  const staleOrUnhealthyCount = data.cameraHealth.filter((camera) => (camera.lastSeenHoursAgo ?? 0) > 48 || camera.status !== "healthy").length;

  const cards = [
    [
      "Cameras With Alerts",
      formatCompactNumber(data.kpis.camerasWithAlerts),
      data.kpis.camerasWithAlerts > 0 ? "text-stone-200" : "text-zinc-100"
    ],
    [
      "Stale / Unhealthy",
      formatCompactNumber(staleOrUnhealthyCount),
      staleOrUnhealthyCount > 0 ? "text-stone-200" : "text-zinc-100"
    ],
    ["Avg Upload Lag", formatDurationShort(data.kpis.avgUploadLagSeconds), "text-zinc-100"],
    ["Avg Processing Lag", formatDurationShort(data.kpis.avgProcessingLagSeconds), "text-zinc-100"],
    [
      "Upload Success",
      formatPercent(data.kpis.uploadSuccessPct / 100),
      data.kpis.uploadSuccessPct < 95 ? "text-stone-200" : "text-zinc-100"
    ],
    [
      "JSON Completion",
      formatPercent(data.kpis.jsonProcessedPct / 100),
      data.kpis.jsonProcessedPct < 90 ? "text-stone-200" : "text-zinc-100"
    ]
  ];

  return (
    <div className="grid metric-grid gap-3">
      {cards.map(([label, value, tone]) => (
        <MetricCard key={label} label={label} value={value} tone={tone} />
      ))}
    </div>
  );
};
