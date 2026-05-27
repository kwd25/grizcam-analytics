import type { KpiResponse } from "@grizcam/shared";
import { formatCompactNumber, formatNumber, formatPercent, titleCase } from "../lib/utils";

type MetricCardProps = {
  index: number;
  label: string;
  value: string;
  /** Long values (camera names, species) need to wrap rather than shrink. */
  textual?: boolean;
};

const MetricCard = ({ index, label, value, textual = false }: MetricCardProps) => (
  <div className="panel flex flex-col gap-2 rounded-lg p-4">
    <div className="flex items-center gap-2 text-[11px] uppercase tracking-[0.22em] text-zinc-400">
      <span className="font-mono tabular-nums text-zinc-500">{String(index).padStart(2, "0")}</span>
      <span className="text-zinc-500">/</span>
      <span className="font-semibold">{label}</span>
    </div>
    <div
      className={
        textual
          ? "text-base font-medium leading-tight text-white"
          : "font-mono text-2xl font-medium leading-none tabular-nums text-white"
      }
    >
      {value}
    </div>
  </div>
);

export const KpiStrip = ({ data }: { data: KpiResponse }) => {
  const cards: Array<{ label: string; value: string; textual?: boolean }> = [
    { label: "Total Events", value: formatCompactNumber(data.totalUniqueEventGroups) },
    { label: "Total Captures", value: formatCompactNumber(data.totalRawRows) },
    { label: "Wildlife Share", value: formatPercent(data.wildlifeSharePct / 100) },
    { label: "Human Share", value: formatPercent(data.humanSharePct / 100) },
    { label: "Vehicle Share", value: formatPercent(data.vehicleSharePct / 100) },
    { label: "Most Active Camera", value: data.mostActiveCamera ?? "N/A", textual: true },
    { label: "Peak Activity Hour", value: data.peakActivityHour === null ? "N/A" : `${data.peakActivityHour}:00` },
    { label: "Avg Daily Events", value: formatNumber(data.avgDailyEventGroups, 1) },
    { label: "Avg Images Per Event", value: formatNumber(data.avgBurstLength, 2) },
    { label: "Wildlife Types Seen", value: formatNumber(data.biodiversityScore) },
    { label: "Night Activity Share", value: formatPercent(data.nocturnalityScore) },
    { label: "Dawn Dusk Share", value: formatPercent(data.dawnDuskPreference) },
    { label: "Top Species", value: data.topSpecies ? titleCase(data.topSpecies) : "N/A", textual: true }
  ];

  return (
    <div className="grid metric-grid gap-3">
      {cards.map((card, index) => (
        <MetricCard key={card.label} index={index + 1} {...card} />
      ))}
    </div>
  );
};
