import type { MonthlyActivityCategoryPoint } from "@grizcam/shared";
import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { axisStroke, chartSeries, gridStroke, tooltipStyle } from "../../lib/chartColors";
import { SectionCard } from "../SectionCard";

export const MonthlyActivityByCategoryChart = ({ data }: { data: MonthlyActivityCategoryPoint[] }) => (
  <SectionCard
    title="Monthly Activity by Category"
    subtitle="Seasonal activity patterns across the filtered selection."
  >
    <div className="h-80">
      <ResponsiveContainer>
        <BarChart data={data}>
          <CartesianGrid stroke={gridStroke} vertical={false} />
          <XAxis dataKey="month" stroke={axisStroke} />
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
