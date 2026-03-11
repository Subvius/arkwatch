import * as React from 'react';
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip as RechartsTooltip, XAxis, YAxis } from 'recharts';
import type { TopAppStat } from '../../../shared/types';
import { formatDuration } from '../lib/utils';
import { ChartLegend } from './ChartLegend';
import { useChartTheme } from '../lib/use-chart-theme';

type ActivityLineChartProps = {
  apps: TopAppStat[];
};

export const ActivityLineChart = ({ apps }: ActivityLineChartProps): React.JSX.Element => {
  const ct = useChartTheme();

  const data = apps.slice(0, 6).map((app) => ({
    name: app.appName.length > 14 ? app.appName.slice(0, 14) + '...' : app.appName,
    minutes: Math.round(app.activeSeconds / 60),
    rawSeconds: app.activeSeconds
  }));

  return (
    <div className="flex flex-col gap-3">
      <ChartLegend items={[{ color: ct.active, label: 'Active time' }]} />
      <div className="h-[220px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
            <defs>
              <linearGradient id="areaGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={ct.active} stopOpacity={ct.areaOpacity} />
                <stop offset="100%" stopColor={ct.active} stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke={ct.grid} vertical={false} />
            <XAxis
              dataKey="name"
              tick={{ fill: ct.axis, fontSize: 10, fontFamily: 'JetBrains Mono' }}
              axisLine={{ stroke: ct.axisLine }}
              tickLine={false}
              interval={0}
              angle={-20}
              textAnchor="end"
              height={50}
            />
            <YAxis
              tick={{ fill: ct.axis, fontSize: 10, fontFamily: 'JetBrains Mono' }}
              axisLine={false}
              tickLine={false}
              unit="m"
            />
            <RechartsTooltip
              contentStyle={ct.tooltipStyle}
              formatter={(_value: number, _name: string, props: { payload?: { rawSeconds?: number } }) => [
                props.payload?.rawSeconds != null ? formatDuration(props.payload.rawSeconds) : `${_value}m`,
                'Active'
              ]}
              cursor={{ stroke: ct.axisLine, strokeDasharray: '3 3' }}
            />
            <Area
              type="monotone"
              dataKey="minutes"
              stroke={ct.active}
              strokeWidth={2}
              fill="url(#areaGradient)"
              dot={{ r: 3, fill: ct.active, stroke: ct.tooltipBg, strokeWidth: 2 }}
              activeDot={{ r: 4, fill: ct.active, stroke: ct.tooltipBg, strokeWidth: 2 }}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};
