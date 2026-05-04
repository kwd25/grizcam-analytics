import type { InsightItem } from "@grizcam/shared";
import { SectionCard } from "./SectionCard";

const toneClasses: Record<InsightItem["tone"], string> = {
  info: "border-white/15 bg-white/10 text-zinc-100",
  positive: "border-white/15 bg-white/10 text-zinc-100",
  warning: "border-stone-400/25 bg-stone-400/10 text-stone-100",
  alert: "border-red-300/20 bg-red-300/10 text-red-100"
};

export const InsightList = ({ items }: { items: InsightItem[] }) => (
  <SectionCard title="What Changed" subtitle="Rules-based highlights from the current selection.">
    <div className="grid gap-3 md:grid-cols-2">
      {items.map((item) => (
        <div key={item.title} className={`rounded-2xl border p-4 ${toneClasses[item.tone]}`}>
          <div className="text-sm font-semibold">{item.title}</div>
          <div className="mt-2 text-sm leading-6 opacity-90">{item.detail}</div>
        </div>
      ))}
    </div>
  </SectionCard>
);
