import * as React from 'react';
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip as RechartsTooltip, XAxis, YAxis } from 'recharts';
import { ChartLegend } from './ChartLegend';
import { useChartTheme } from '../lib/use-chart-theme';

type WeeklyChartProps = {
  data: Array<{ day: string; activeHours: number; idleHours: number }>;
};

export const WeeklyChart = ({ data }: WeeklyChartProps): React.JSX.Element => {
  const ct = useChartTheme();

  return (
    <div className="flex flex-col gap-3">
      <ChartLegend items={[
        { color: ct.active, label: 'Active' },
        { color: ct.idle, label: 'Idle' }
      ]} />
      <div className="h-[220px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 4, right: 4, left: -20, bottom: 0 }} barGap={2}>
            <CartesianGrid strokeDasharray="3 3" stroke={ct.grid} vertical={false} />
            <XAxis
              dataKey="day"
              tick={{ fill: ct.axis, fontSize: 10, fontFamily: 'JetBrains Mono' }}
              axisLine={{ stroke: ct.axisLine }}
              tickLine={false}
            />
            <YAxis
              tick={{ fill: ct.axis, fontSize: 10, fontFamily: 'JetBrains Mono' }}
              axisLine={false}
              tickLine={false}
              unit="h"
            />
            <RechartsTooltip
              contentStyle={ct.tooltipStyle}
              cursor={{ fill: ct.cursorFill }}
              formatter={(value: number, name: string) => [
                `${value}h`,
                name === 'activeHours' ? 'Active' : 'Idle'
              ]}
            />
            <Bar dataKey="activeHours" fill={ct.active} radius={[3, 3, 0, 0]} maxBarSize={28} />
            <Bar dataKey="idleHours" fill={ct.idle} radius={[3, 3, 0, 0]} maxBarSize={28} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};
