import type { DailyActivityPoint } from "@grizcam/shared";
import { ResponsiveContainer, AreaChart, Area, CartesianGrid, Legend, Tooltip, XAxis, YAxis } from "recharts";
import { axisStroke, BRAND, chartSeries, gridStroke, tooltipStyle } from "../../lib/chartColors";
import { SectionCard } from "../SectionCard";

type DailyTrendChartProps = {
  data: DailyActivityPoint[];
  onSelectDate: (date: string) => void;
};

export const DailyTrendChart = ({ data, onSelectDate }: DailyTrendChartProps) => {
  const cameraNames = Array.from(new Set(data.map((point) => point.cameraName)));
  const rows = Array.from(
    data.reduce((map, point) => {
      const current = map.get(point.date) ?? ({ date: point.date, total: 0 } as Record<string, string | number>);
      current.total = Number(current.total ?? 0) + point.uniqueEventGroups;
      current[point.cameraName] = point.uniqueEventGroups;
      map.set(point.date, current);
      return map;
    }, new Map<string, Record<string, number | string>>()).values()
  );

  return (
    <SectionCard title="Daily Activity Trend" subtitle="Click a day to open a detailed drilldown panel.">
      <div className="h-80">
        <ResponsiveContainer>
          <AreaChart data={rows} onClick={(state) => state?.activeLabel && onSelectDate(String(state.activeLabel))}>
            <CartesianGrid stroke={gridStroke} vertical={false} />
            <XAxis dataKey="date" stroke={axisStroke} minTickGap={36} />
            <YAxis stroke={axisStroke} />
            <Tooltip contentStyle={tooltipStyle} />
            <Legend />
            <Area
              type="monotone"
              dataKey="total"
              stroke={BRAND.pitchBlack}
              fill={BRAND.taupe}
              fillOpacity={0.12}
              strokeWidth={2}
              name="All cameras"
            />
            {cameraNames.slice(0, 4).map((cameraName, index) => (
              <Area
                key={cameraName}
                type="monotone"
                dataKey={cameraName}
                stroke={chartSeries[(index + 1) % chartSeries.length]}
                fillOpacity={0}
                strokeWidth={1.5}
                name={cameraName}
              />
            ))}
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </SectionCard>
  );
};
