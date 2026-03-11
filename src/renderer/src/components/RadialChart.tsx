import * as React from 'react';
import { RadialBarChart, RadialBar, PolarAngleAxis, ResponsiveContainer } from 'recharts';
import { formatDuration } from '../lib/utils';
import { useChartTheme } from '../lib/use-chart-theme';

type RadialChartProps = {
  activeSeconds: number;
  idleSeconds: number;
  goalSeconds: number;
};

export const RadialChart = ({ activeSeconds, idleSeconds, goalSeconds }: RadialChartProps): React.JSX.Element => {
  const ct = useChartTheme();
  const activePct = Math.min((activeSeconds / Math.max(goalSeconds, 1)) * 100, 100);
  const idlePct = Math.min((idleSeconds / Math.max(goalSeconds, 1)) * 100, 100);

  const data = [
    { name: 'Idle', value: idlePct, fill: ct.idle },
    { name: 'Active', value: activePct, fill: ct.active }
  ];

  return (
    <div className="flex flex-col items-center gap-3">
      <div className="relative h-[150px] w-[150px]">
        <ResponsiveContainer width="100%" height="100%">
          <RadialBarChart
            cx="50%"
            cy="50%"
            innerRadius="60%"
            outerRadius="100%"
            startAngle={210}
            endAngle={-30}
            data={data}
            barSize={10}
          >
            <PolarAngleAxis type="number" domain={[0, 100]} tick={false} angleAxisId={0} />
            <RadialBar
              dataKey="value"
              cornerRadius={5}
              background={{ fill: ct.radialBg }}
              angleAxisId={0}
            />
          </RadialBarChart>
        </ResponsiveContainer>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-lg font-bold tabular-nums">{formatDuration(activeSeconds)}</span>
          <span className="text-[9px] text-[hsl(var(--muted))]">of {formatDuration(goalSeconds)} goal</span>
        </div>
      </div>
      <div className="flex items-center gap-4 text-[10px]">
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-2 w-2 rounded-full" style={{ background: ct.active }} />
          <span className="text-[hsl(var(--muted))]">Active</span>
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-2 w-2 rounded-full" style={{ background: ct.idle }} />
          <span className="text-[hsl(var(--muted))]">Idle</span>
        </span>
      </div>
    </div>
  );
};
