import type { CompositionPoint } from "@grizcam/shared";
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";
import { chartSeries, tooltipStyle } from "../../lib/chartColors";
import { SectionCard } from "../SectionCard";

export const CompositionChart = ({ data }: { data: CompositionPoint[] }) => (
  <SectionCard title="Activity Composition" subtitle="Wildlife versus human, vehicle, and empty-scene mix.">
    <div className="h-72">
      <ResponsiveContainer>
        <PieChart>
          <Pie data={data} dataKey="uniqueEventGroups" nameKey="category" innerRadius={64} outerRadius={100} paddingAngle={2}>
            {data.map((entry, index) => (
              <Cell key={entry.category} fill={chartSeries[index % chartSeries.length]} />
            ))}
          </Pie>
          <Tooltip contentStyle={tooltipStyle} />
        </PieChart>
      </ResponsiveContainer>
    </div>
  </SectionCard>
);
