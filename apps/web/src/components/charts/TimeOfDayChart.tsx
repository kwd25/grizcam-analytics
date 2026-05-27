import type { TimeOfDayCompositionPoint } from "@grizcam/shared";
import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { axisStroke, chartSeries, gridStroke, tooltipStyle } from "../../lib/chartColors";
import { SectionCard } from "../SectionCard";

export const TimeOfDayChart = ({ data }: { data: TimeOfDayCompositionPoint[] }) => (
  <SectionCard title="Time-Of-Day Composition" subtitle="Unique event groups by daylight bucket and subject type.">
    <div className="h-72">
      <ResponsiveContainer>
        <BarChart data={data}>
          <CartesianGrid stroke={gridStroke} vertical={false} />
          <XAxis dataKey="bucket" stroke={axisStroke} />
          <YAxis stroke={axisStroke} />
          <Tooltip contentStyle={tooltipStyle} />
          <Legend />
          <Bar dataKey="wildlife" stackId="a" fill={chartSeries[0]} />
          <Bar dataKey="human" stackId="a" fill={chartSeries[1]} />
          <Bar dataKey="vehicle" stackId="a" fill={chartSeries[2]} />
          <Bar dataKey="emptyScene" stackId="a" fill={chartSeries[3]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  </SectionCard>
);
