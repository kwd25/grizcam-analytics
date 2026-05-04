import type { CompositionPoint } from "@grizcam/shared";
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";
import { SectionCard } from "../SectionCard";

export const CompositionChart = ({ data }: { data: CompositionPoint[] }) => {
  const palette = ["#e5e5e5", "#b8b8b8", "#8f8f8f", "#5f5f5f"];

  return (
    <SectionCard title="Activity Composition" subtitle="Wildlife versus human, vehicle, and empty-scene mix.">
      <div className="h-72">
        <ResponsiveContainer>
          <PieChart>
            <Pie data={data} dataKey="uniqueEventGroups" nameKey="category" innerRadius={64} outerRadius={100} paddingAngle={2}>
              {data.map((entry, index) => (
                <Cell key={entry.category} fill={palette[index % palette.length]} />
              ))}
            </Pie>
            <Tooltip contentStyle={{ background: "#202020", border: "1px solid rgba(255,255,255,0.12)", borderRadius: 16 }} />
          </PieChart>
        </ResponsiveContainer>
      </div>
    </SectionCard>
  );
};
