import * as React from 'react';
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip as RechartsTooltip, XAxis, YAxis } from 'recharts';
import type { TopAppStat } from '../../../shared/types';
import { formatDuration } from '../lib/utils';
import { ChartLegend } from './ChartLegend';

type ActivityLineChartProps = {
  apps: TopAppStat[];
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

export const ActivityLineChart = ({ apps }: ActivityLineChartProps): React.JSX.Element => {
  const data = apps.slice(0, 6).map((app) => ({
    name: app.appName.length > 14 ? app.appName.slice(0, 14) + '...' : app.appName,
    minutes: Math.round(app.activeSeconds / 60),
    rawSeconds: app.activeSeconds
  }));

  return (
    <div className="flex flex-col gap-3">
      <ChartLegend items={[{ color: '#6366f1', label: 'Active time' }]} />
      <div className="h-[220px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
            <defs>
              <linearGradient id="areaGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#6366f1" stopOpacity={0.2} />
                <stop offset="100%" stopColor="#6366f1" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" vertical={false} />
            <XAxis
              dataKey="name"
              tick={{ fill: '#9ca3af', fontSize: 10, fontFamily: 'JetBrains Mono' }}
              axisLine={{ stroke: '#e5e7eb' }}
              tickLine={false}
              interval={0}
              angle={-20}
              textAnchor="end"
              height={50}
            />
            <YAxis
              tick={{ fill: '#9ca3af', fontSize: 10, fontFamily: 'JetBrains Mono' }}
              axisLine={false}
              tickLine={false}
              unit="m"
            />
            <RechartsTooltip
              contentStyle={tooltipStyle}
              formatter={(_value: number, _name: string, props: { payload?: { rawSeconds?: number } }) => [
                props.payload?.rawSeconds != null ? formatDuration(props.payload.rawSeconds) : `${_value}m`,
                'Active'
              ]}
              cursor={{ stroke: '#d1d5db', strokeDasharray: '3 3' }}
            />
            <Area
              type="monotone"
              dataKey="minutes"
              stroke="#6366f1"
              strokeWidth={2}
              fill="url(#areaGradient)"
              dot={{ r: 3, fill: '#6366f1', stroke: '#fff', strokeWidth: 2 }}
              activeDot={{ r: 4, fill: '#6366f1', stroke: '#fff', strokeWidth: 2 }}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};
