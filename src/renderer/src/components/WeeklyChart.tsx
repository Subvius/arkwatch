import * as React from 'react';
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip as RechartsTooltip, XAxis, YAxis } from 'recharts';
import { ChartLegend } from './ChartLegend';

type WeeklyChartProps = {
  data: Array<{ day: string; activeHours: number; idleHours: number }>;
};

const tooltipStyle = {
  border: '1px solid #e5e7eb',
  borderRadius: 8,
  boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
  background: '#fff',
  fontSize: 11,
  fontFamily: 'JetBrains Mono, monospace',
  padding: '8px 12px'
};

export const WeeklyChart = ({ data }: WeeklyChartProps): React.JSX.Element => {
  return (
    <div className="flex flex-col gap-3">
      <ChartLegend items={[
        { color: '#6366f1', label: 'Active' },
        { color: '#e0e7ff', label: 'Idle' }
      ]} />
      <div className="h-[220px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 4, right: 4, left: -20, bottom: 0 }} barGap={2}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" vertical={false} />
            <XAxis
              dataKey="day"
              tick={{ fill: '#9ca3af', fontSize: 10, fontFamily: 'JetBrains Mono' }}
              axisLine={{ stroke: '#e5e7eb' }}
              tickLine={false}
            />
            <YAxis
              tick={{ fill: '#9ca3af', fontSize: 10, fontFamily: 'JetBrains Mono' }}
              axisLine={false}
              tickLine={false}
              unit="h"
            />
            <RechartsTooltip
              contentStyle={tooltipStyle}
              cursor={{ fill: 'rgba(0,0,0,0.02)' }}
              formatter={(value: number, name: string) => [
                `${value}h`,
                name === 'activeHours' ? 'Active' : 'Idle'
              ]}
            />
            <Bar dataKey="activeHours" fill="#6366f1" radius={[3, 3, 0, 0]} maxBarSize={28} />
            <Bar dataKey="idleHours" fill="#e0e7ff" radius={[3, 3, 0, 0]} maxBarSize={28} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};
