import type { TimeOfDayCompositionPoint } from "@grizcam/shared";
import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { SectionCard } from "../SectionCard";

export const TimeOfDayChart = ({ data }: { data: TimeOfDayCompositionPoint[] }) => (
  <SectionCard title="Time-Of-Day Composition" subtitle="Unique event groups by daylight bucket and subject type.">
    <div className="h-72">
      <ResponsiveContainer>
        <BarChart data={data}>
          <CartesianGrid stroke="rgba(255,255,255,0.08)" vertical={false} />
          <XAxis dataKey="bucket" stroke="#a1a1aa" />
          <YAxis stroke="#a1a1aa" />
          <Tooltip contentStyle={{ background: "#202020", border: "1px solid rgba(255,255,255,0.12)", borderRadius: 16 }} />
          <Legend />
          <Bar dataKey="wildlife" stackId="a" fill="#e5e5e5" />
          <Bar dataKey="human" stackId="a" fill="#b8b8b8" />
          <Bar dataKey="vehicle" stackId="a" fill="#8f8f8f" />
          <Bar dataKey="emptyScene" stackId="a" fill="#5f5f5f" />
        </BarChart>
      </ResponsiveContainer>
    </div>
  </SectionCard>
);
