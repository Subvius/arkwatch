import * as React from 'react';
import { endOfDay, format, startOfDay, subDays } from 'date-fns';
import { Calendar, CalendarDays, Clock, Trophy, X } from 'lucide-react';
import {
  Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip as RechartsTooltip,
  XAxis, YAxis, Area, AreaChart, PieChart, Pie, Cell,
} from 'recharts';
import { motion } from 'framer-motion';
import type { DailyStat, SummaryStats, TopAppStat } from '../../../shared/types';
import { formatDuration, cn } from '../lib/utils';
import { useChartTheme } from '../lib/use-chart-theme';
import { ChartLegend } from './ChartLegend';
import { Skeleton } from './ui/skeleton';
import {
  MorphingDialog,
  MorphingDialogTrigger,
  MorphingDialogContainer,
  MorphingDialogContent,
  MorphingDialogClose,
  MorphingDialogTitle,
  MorphingDialogDescription,
  useMorphingDialogReady,
} from './ui/morphing-dialog';

type WidgetData = {
  yesterday: SummaryStats;
  yesterdayApps: TopAppStat[];
  week: SummaryStats;
  weekApps: TopAppStat[];
  month: SummaryStats;
  topApp: TopAppStat | null;
};

const DIALOG_CLASS = 'w-[380px] max-h-[80vh] rounded-2xl border bg-[hsl(var(--panel))] p-6 shadow-lg';
const TRIGGER_CLASS = 'min-w-0 rounded-lg border bg-[hsl(var(--panel))] p-4 shadow-sm hover:border-[hsl(var(--accent))]/20 transition-colors';

function BreakdownRow({ label, value }: { label: string; value: string }): React.JSX.Element {
  return (
    <div className="flex items-center justify-between py-1.5">
      <span className="text-xs text-[hsl(var(--muted))]">{label}</span>
      <span className="text-sm font-medium tabular-nums">{value}</span>
    </div>
  );
}

function DialogHeader({ title }: { title: string }): React.JSX.Element {
  return (
    <div className="flex items-center justify-between mb-4">
      <MorphingDialogTitle>{title}</MorphingDialogTitle>
      <MorphingDialogClose className="rounded-full p-1 hover:bg-[hsl(var(--border))] transition-colors">
        <X className="h-4 w-4" />
      </MorphingDialogClose>
    </div>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }): React.JSX.Element {
  return (
    <p className="mb-1 mt-3 text-[10px] font-semibold uppercase tracking-wider text-[hsl(var(--muted))]">
      {children}
    </p>
  );
}

function AppList({ apps, totalSeconds }: { apps: TopAppStat[]; totalSeconds: number }): React.JSX.Element {
  const ct = useChartTheme();
  const ready = useMorphingDialogReady();
  if (apps.length === 0) return <p className="py-2 text-xs text-[hsl(var(--muted))]">No app data</p>;

  return (
    <div className="space-y-1.5">
      {apps.map((app) => {
        const pct = totalSeconds > 0 ? (app.activeSeconds / totalSeconds) * 100 : 0;
        return (
          <div key={app.appName} className="flex items-center gap-2">
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between mb-0.5">
                <span className="truncate text-xs">{app.appName}</span>
                <span className="ml-2 shrink-0 text-[10px] tabular-nums text-[hsl(var(--muted))]">
                  {formatDuration(app.activeSeconds)}
                </span>
              </div>
              <div className="h-1 w-full rounded-full bg-[hsl(var(--border))]">
                <div
                  className="h-1 rounded-full"
                  style={{
                    width: ready ? `${Math.max(pct, 1)}%` : '0%',
                    background: ct.active,
                    transition: ready ? 'width 0.6s ease-out' : 'none',
                  }}
                />
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function getBusiestDay(days: DailyStat[]): DailyStat | null {
  if (days.length === 0) return null;
  return days.reduce((best, day) => day.activeSeconds > best.activeSeconds ? day : best, days[0]);
}

function WidgetSkeleton(): React.JSX.Element {
  return (
    <div className="rounded-lg border bg-[hsl(var(--panel))] p-4 shadow-sm">
      <Skeleton className="mb-2 h-3 w-20" />
      <Skeleton className="mb-1 h-6 w-24" />
      <Skeleton className="h-3 w-12" />
    </div>
  );
}

// --- Yesterday: donut + app list ---

function YesterdayDialogBody({ data, apps }: { data: SummaryStats; apps: TopAppStat[] }): React.JSX.Element {
  const ct = useChartTheme();
  const ready = useMorphingDialogReady();
  const total = data.totalActiveSeconds + data.totalIdleSeconds;
  const activePct = total > 0 ? Math.round((data.totalActiveSeconds / total) * 100) : 0;

  const pieData = total > 0
    ? [
        { name: 'Active', value: data.totalActiveSeconds },
        { name: 'Idle', value: data.totalIdleSeconds },
      ]
    : [{ name: 'Empty', value: 1 }];
  const colors = total > 0 ? [ct.active, ct.idle] : [ct.radialBg];

  return (
    <>
      <div className="flex items-center gap-5 mb-3">
        <motion.div
          className="relative h-[100px] w-[100px] shrink-0"
          initial={{ scale: 0, opacity: 0 }}
          animate={ready ? { scale: 1, opacity: 1 } : { scale: 0, opacity: 0 }}
          transition={{ duration: 0.5, ease: [0.34, 1.3, 0.64, 1] }}
        >
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={pieData}
                cx="50%"
                cy="50%"
                innerRadius={30}
                outerRadius={46}
                dataKey="value"
                strokeWidth={0}
                startAngle={90}
                endAngle={-270}
                isAnimationActive={false}
              >
                {pieData.map((entry, i) => (
                  <Cell key={entry.name} fill={colors[i]} />
                ))}
              </Pie>
            </PieChart>
          </ResponsiveContainer>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-base font-bold tabular-nums">{activePct}%</span>
            <span className="text-[8px] text-[hsl(var(--muted))]">active</span>
          </div>
        </motion.div>
        <div className="flex-1 min-w-0">
          <ChartLegend items={[
            { color: ct.active, label: 'Active' },
            { color: ct.idle, label: 'Idle' },
          ]} />
          <div className="mt-2 divide-y divide-[hsl(var(--border))]">
            <BreakdownRow label="Active" value={formatDuration(data.totalActiveSeconds)} />
            <BreakdownRow label="Idle" value={formatDuration(data.totalIdleSeconds)} />
            <BreakdownRow label="Tracked" value={formatDuration(data.totalTrackedSeconds)} />
          </div>
        </div>
      </div>

      <SectionLabel>Top Apps</SectionLabel>
      <AppList apps={apps} totalSeconds={data.totalActiveSeconds} />
    </>
  );
}

function YesterdayWidget({ data, apps }: { data: SummaryStats; apps: TopAppStat[] }): React.JSX.Element {
  return (
    <MorphingDialog>
      <MorphingDialogTrigger className={TRIGGER_CLASS}>
        <div className="flex items-center gap-2 mb-1">
          <Clock className="h-3.5 w-3.5 text-[hsl(var(--muted))]" />
          <span className="text-xs font-medium text-[hsl(var(--muted))]">Yesterday</span>
        </div>
        <p className="text-xl font-bold tabular-nums tracking-tight">{formatDuration(data.totalActiveSeconds)}</p>
        <p className="text-xs text-[hsl(var(--muted))]">active</p>
      </MorphingDialogTrigger>
      <MorphingDialogContainer>
        <MorphingDialogContent className={DIALOG_CLASS}>
          <DialogHeader title="Yesterday" />
          <MorphingDialogDescription>
            <YesterdayDialogBody data={data} apps={apps} />
          </MorphingDialogDescription>
        </MorphingDialogContent>
      </MorphingDialogContainer>
    </MorphingDialog>
  );
}

// --- Last 7 Days: bar chart + app list + busiest day ---

function WeekDialogBody({ data, apps }: { data: SummaryStats; apps: TopAppStat[] }): React.JSX.Element {
  const ct = useChartTheme();
  const ready = useMorphingDialogReady();
  const dailyAvg = data.days.length > 0
    ? Math.round(data.totalActiveSeconds / data.days.length)
    : 0;

  const busiest = getBusiestDay(data.days);

  const chartData = data.days.map((day) => ({
    day: format(new Date(day.date), 'EEE'),
    activeHours: Number((day.activeSeconds / 3600).toFixed(2)),
    idleHours: Number((day.idleSeconds / 3600).toFixed(2)),
  }));

  return (
    <>
      {chartData.length > 0 && (
        <div className="mb-3">
          <ChartLegend items={[
            { color: ct.active, label: 'Active' },
            { color: ct.idle, label: 'Idle' },
          ]} />
          <div className="h-[150px] w-full mt-2">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 4, right: 4, left: -20, bottom: 0 }} barGap={2}>
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
                <Bar dataKey="activeHours" fill={ct.active} radius={[3, 3, 0, 0]} maxBarSize={24} isAnimationActive={ready} animationDuration={600} animationEasing="ease-out" />
                <Bar dataKey="idleHours" fill={ct.idle} radius={[3, 3, 0, 0]} maxBarSize={24} isAnimationActive={ready} animationDuration={600} animationEasing="ease-out" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      <div className="divide-y divide-[hsl(var(--border))]">
        <BreakdownRow label="Total active" value={formatDuration(data.totalActiveSeconds)} />
        <BreakdownRow label="Total idle" value={formatDuration(data.totalIdleSeconds)} />
        <BreakdownRow label="Daily average" value={formatDuration(dailyAvg)} />
        {busiest && (
          <BreakdownRow
            label="Busiest day"
            value={`${format(new Date(busiest.date), 'EEE, MMM d')} — ${formatDuration(busiest.activeSeconds)}`}
          />
        )}
      </div>

      <SectionLabel>Top Apps</SectionLabel>
      <AppList apps={apps} totalSeconds={data.totalActiveSeconds} />
    </>
  );
}

function WeekWidget({ data, apps }: { data: SummaryStats; apps: TopAppStat[] }): React.JSX.Element {
  return (
    <MorphingDialog>
      <MorphingDialogTrigger className={TRIGGER_CLASS}>
        <div className="flex items-center gap-2 mb-1">
          <Calendar className="h-3.5 w-3.5 text-[hsl(var(--muted))]" />
          <span className="text-xs font-medium text-[hsl(var(--muted))]">Last 7 Days</span>
        </div>
        <p className="text-xl font-bold tabular-nums tracking-tight">{formatDuration(data.totalActiveSeconds)}</p>
        <p className="text-xs text-[hsl(var(--muted))]">active</p>
      </MorphingDialogTrigger>
      <MorphingDialogContainer>
        <MorphingDialogContent className={DIALOG_CLASS}>
          <DialogHeader title="Last 7 Days" />
          <MorphingDialogDescription>
            <WeekDialogBody data={data} apps={apps} />
          </MorphingDialogDescription>
        </MorphingDialogContent>
      </MorphingDialogContainer>
    </MorphingDialog>
  );
}

// --- Last 30 Days: area chart trend + busiest day ---

function MonthDialogBody({ data }: { data: SummaryStats }): React.JSX.Element {
  const ct = useChartTheme();
  const ready = useMorphingDialogReady();
  const dailyAvg = data.days.length > 0 ? Math.round(data.totalActiveSeconds / data.days.length) : 0;
  const busiest = getBusiestDay(data.days);

  const chartData = data.days.map((day) => ({
    date: format(new Date(day.date), 'd'),
    hours: Number((day.activeSeconds / 3600).toFixed(2)),
    rawSeconds: day.activeSeconds,
  }));

  return (
    <>
      {chartData.length > 0 && (
        <div className="mb-3">
          <ChartLegend items={[{ color: ct.active, label: 'Active time' }]} />
          <div className="h-[140px] w-full mt-2">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="monthAreaGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={ct.active} stopOpacity={ct.areaOpacity} />
                    <stop offset="100%" stopColor={ct.active} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke={ct.grid} vertical={false} />
                <XAxis
                  dataKey="date"
                  tick={{ fill: ct.axis, fontSize: 9, fontFamily: 'JetBrains Mono' }}
                  axisLine={{ stroke: ct.axisLine }}
                  tickLine={false}
                  interval="preserveStartEnd"
                />
                <YAxis
                  tick={{ fill: ct.axis, fontSize: 9, fontFamily: 'JetBrains Mono' }}
                  axisLine={false}
                  tickLine={false}
                  unit="h"
                />
                <RechartsTooltip
                  contentStyle={ct.tooltipStyle}
                  formatter={(_value: number, _name: string, props: { payload?: { rawSeconds?: number } }) => [
                    props.payload?.rawSeconds != null ? formatDuration(props.payload.rawSeconds) : `${_value}h`,
                    'Active'
                  ]}
                  cursor={{ stroke: ct.axisLine, strokeDasharray: '3 3' }}
                />
                <Area
                  type="monotone"
                  dataKey="hours"
                  stroke={ct.active}
                  strokeWidth={1.5}
                  fill="url(#monthAreaGrad)"
                  dot={false}
                  activeDot={{ r: 3, fill: ct.active, stroke: ct.tooltipBg, strokeWidth: 2 }}
                  isAnimationActive={ready}
                  animationDuration={700}
                  animationEasing="ease-out"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}
      <div className="divide-y divide-[hsl(var(--border))]">
        <BreakdownRow label="Active time" value={formatDuration(data.totalActiveSeconds)} />
        <BreakdownRow label="Idle time" value={formatDuration(data.totalIdleSeconds)} />
        <BreakdownRow label="Total tracked" value={formatDuration(data.totalTrackedSeconds)} />
        <BreakdownRow label="Daily average" value={formatDuration(dailyAvg)} />
        {busiest && (
          <BreakdownRow
            label="Busiest day"
            value={`${format(new Date(busiest.date), 'MMM d')} — ${formatDuration(busiest.activeSeconds)}`}
          />
        )}
      </div>
    </>
  );
}

function MonthWidget({ data }: { data: SummaryStats }): React.JSX.Element {
  return (
    <MorphingDialog>
      <MorphingDialogTrigger className={TRIGGER_CLASS}>
        <div className="flex items-center gap-2 mb-1">
          <CalendarDays className="h-3.5 w-3.5 text-[hsl(var(--muted))]" />
          <span className="text-xs font-medium text-[hsl(var(--muted))]">Last 30 Days</span>
        </div>
        <p className="text-xl font-bold tabular-nums tracking-tight">{formatDuration(data.totalActiveSeconds)}</p>
        <p className="text-xs text-[hsl(var(--muted))]">active</p>
      </MorphingDialogTrigger>
      <MorphingDialogContainer>
        <MorphingDialogContent className={DIALOG_CLASS}>
          <DialogHeader title="Last 30 Days" />
          <MorphingDialogDescription>
            <MonthDialogBody data={data} />
          </MorphingDialogDescription>
        </MorphingDialogContent>
      </MorphingDialogContainer>
    </MorphingDialog>
  );
}

// --- Top App: horizontal bar chart of top 5 apps ---

const APP_COLORS = [
  'var(--chart-active, #6366f1)',
  'var(--chart-idle, #e0e7ff)',
  '#a78bfa',
  '#818cf8',
  '#c4b5fd',
];

function TopAppDialogBody({
  app,
  topApps,
  weekActiveSeconds,
  dayCount,
}: {
  app: TopAppStat;
  topApps: TopAppStat[];
  weekActiveSeconds: number;
  dayCount: number;
}): React.JSX.Element {
  const ct = useChartTheme();
  const ready = useMorphingDialogReady();
  const percentage = weekActiveSeconds > 0
    ? Math.round((app.activeSeconds / weekActiveSeconds) * 100)
    : 0;

  const dailyAvg = dayCount > 0 ? Math.round(app.activeSeconds / dayCount) : 0;
  const runnerUp = topApps.length > 1 ? topApps[1] : null;
  const lead = runnerUp ? app.activeSeconds - runnerUp.activeSeconds : 0;

  const barData = topApps.slice(0, 5).map((a) => ({
    name: a.appName.length > 16 ? a.appName.slice(0, 16) + '...' : a.appName,
    hours: Number((a.activeSeconds / 3600).toFixed(2)),
    rawSeconds: a.activeSeconds,
  }));

  return (
    <>
      {barData.length > 0 && (
        <div className="mb-3">
          <div className="h-[140px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={barData} layout="vertical" margin={{ top: 0, right: 4, left: 2, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={ct.grid} horizontal={false} />
                <XAxis
                  type="number"
                  tick={{ fill: ct.axis, fontSize: 9, fontFamily: 'JetBrains Mono' }}
                  axisLine={{ stroke: ct.axisLine }}
                  tickLine={false}
                  unit="h"
                />
                <YAxis
                  dataKey="name"
                  type="category"
                  tick={{ fill: ct.axis, fontSize: 9, fontFamily: 'JetBrains Mono' }}
                  axisLine={false}
                  tickLine={false}
                  width={90}
                />
                <RechartsTooltip
                  contentStyle={ct.tooltipStyle}
                  formatter={(_value: number, _name: string, props: { payload?: { rawSeconds?: number } }) => [
                    props.payload?.rawSeconds != null ? formatDuration(props.payload.rawSeconds) : `${_value}h`,
                    'Active'
                  ]}
                  cursor={{ fill: ct.cursorFill }}
                />
                <Bar dataKey="hours" radius={[0, 3, 3, 0]} maxBarSize={18} isAnimationActive={ready} animationDuration={600} animationEasing="ease-out">
                  {barData.map((_entry, i) => (
                    <Cell key={i} fill={APP_COLORS[i % APP_COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      <SectionLabel>Leader</SectionLabel>
      <div className="divide-y divide-[hsl(var(--border))]">
        <BreakdownRow label="Top app" value={app.appName} />
        <BreakdownRow label="Weekly total" value={formatDuration(app.activeSeconds)} />
        <BreakdownRow label="Share of active" value={`${percentage}%`} />
        <BreakdownRow label="Daily average" value={formatDuration(dailyAvg)} />
      </div>

      {runnerUp && (
        <>
          <SectionLabel>Runner-up</SectionLabel>
          <div className="divide-y divide-[hsl(var(--border))]">
            <BreakdownRow label="App" value={runnerUp.appName} />
            <BreakdownRow label="Time" value={formatDuration(runnerUp.activeSeconds)} />
            <BreakdownRow label="Lead" value={`+${formatDuration(lead)}`} />
          </div>
        </>
      )}

    </>
  );
}

function TopAppWidget({
  app,
  topApps,
  weekActiveSeconds,
  dayCount,
}: {
  app: TopAppStat | null;
  topApps: TopAppStat[];
  weekActiveSeconds: number;
  dayCount: number;
}): React.JSX.Element {
  return (
    <MorphingDialog>
      <MorphingDialogTrigger className={TRIGGER_CLASS}>
        <div className="flex items-center gap-2 mb-1">
          <Trophy className="h-3.5 w-3.5 text-[hsl(var(--muted))]" />
          <span className="text-xs font-medium text-[hsl(var(--muted))]">Top App (7d)</span>
        </div>
        <p className={cn(
          'text-xl font-bold tracking-tight truncate',
          app ? '' : 'text-[hsl(var(--muted))]'
        )}>
          {app?.appName ?? '—'}
        </p>
        <p className="text-xs text-[hsl(var(--muted))]">
          {app ? formatDuration(app.activeSeconds) : 'no data'}
        </p>
      </MorphingDialogTrigger>
      <MorphingDialogContainer>
        <MorphingDialogContent className={DIALOG_CLASS}>
          <DialogHeader title="Top App (7d)" />
          <MorphingDialogDescription>
            {app ? (
              <TopAppDialogBody app={app} topApps={topApps} weekActiveSeconds={weekActiveSeconds} dayCount={dayCount} />
            ) : (
              <p className="text-sm text-[hsl(var(--muted))]">No usage data for the past week.</p>
            )}
          </MorphingDialogDescription>
        </MorphingDialogContent>
      </MorphingDialogContainer>
    </MorphingDialog>
  );
}

export function UsageWidgets(): React.JSX.Element {
  const [data, setData] = React.useState<WidgetData | null>(null);

  const fetchData = React.useCallback(async () => {
    const now = new Date();
    const yesterdayRange = {
      from: startOfDay(subDays(now, 1)).toISOString(),
      to: endOfDay(subDays(now, 1)).toISOString(),
    };
    const weekRange = {
      from: startOfDay(subDays(now, 7)).toISOString(),
      to: endOfDay(subDays(now, 1)).toISOString(),
    };
    const monthRange = {
      from: startOfDay(subDays(now, 30)).toISOString(),
      to: endOfDay(subDays(now, 1)).toISOString(),
    };

    const [yesterday, week, month, yesterdayApps, weekApps] = await Promise.all([
      window.arkwatch.stats.getSummary(yesterdayRange),
      window.arkwatch.stats.getSummary(weekRange),
      window.arkwatch.stats.getSummary(monthRange),
      window.arkwatch.stats.getTopApps({ ...yesterdayRange, limit: 5 }),
      window.arkwatch.stats.getTopApps({ ...weekRange, limit: 5 }),
    ]);

    setData({
      yesterday,
      yesterdayApps,
      week,
      weekApps,
      month,
      topApp: weekApps[0] ?? null,
    });
  }, []);

  React.useEffect(() => {
    let timeoutId: number | null = null;
    let cancelled = false;

    const poll = async (): Promise<void> => {
      try {
        await fetchData();
      } finally {
        if (!cancelled) {
          timeoutId = window.setTimeout(() => {
            void poll();
          }, 60_000);
        }
      }
    };

    void poll();

    return () => {
      cancelled = true;
      if (timeoutId !== null) {
        window.clearTimeout(timeoutId);
      }
    };
  }, [fetchData]);

  return (
    <section>
      <h2 className="mb-2 text-xs font-medium text-[hsl(var(--muted))]">Usage Summary</h2>
      {!data ? (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <WidgetSkeleton />
          <WidgetSkeleton />
          <WidgetSkeleton />
          <WidgetSkeleton />
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <YesterdayWidget data={data.yesterday} apps={data.yesterdayApps} />
          <WeekWidget data={data.week} apps={data.weekApps} />
          <MonthWidget data={data.month} />
          <TopAppWidget app={data.topApp} topApps={data.weekApps} weekActiveSeconds={data.week.totalActiveSeconds} dayCount={data.week.days.length} />
        </div>
      )}
    </section>
  );
}

