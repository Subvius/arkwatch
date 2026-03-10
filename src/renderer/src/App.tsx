import * as React from 'react';
import { endOfDay, format, startOfDay, subDays } from 'date-fns';
import { PauseCircle, PlayCircle, Settings2 } from 'lucide-react';
import type { AIToolDailyStat, AIToolProcess, AppSettings, SummaryStats, TopAppStat, TrackerStatus } from '../../shared/types';
import { formatDuration } from './lib/utils';
import { AI_TOOLS, type AIToolId } from './lib/ai-tools';
import { Button } from './components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from './components/ui/dialog';
import { Input } from './components/ui/input';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from './components/ui/tooltip';
import { TitleBar } from './components/TitleBar';
import { StatCard } from './components/StatCard';
import { AIToolCard } from './components/AIToolCard';
import { WeeklyChart } from './components/WeeklyChart';
import { RadialChart } from './components/RadialChart';
import { ActivityLineChart } from './components/ActivityLineChart';
import { TopAppsTable } from './components/TopAppsTable';
import { DashboardSkeleton } from './components/DashboardSkeleton';

const emptySummary: SummaryStats = {
  totalActiveSeconds: 0,
  totalIdleSeconds: 0,
  totalTrackedSeconds: 0,
  days: []
};

const idleLabel = (idleSeconds: number): string => {
  if (idleSeconds < 60) return `${idleSeconds}s`;
  return `${Math.floor(idleSeconds / 60)}m`;
};

type AIToolStats = Record<AIToolId, { activeSeconds: number; sessionCount: number }>;

const emptyAIToolStats: AIToolStats = {
  claude: { activeSeconds: 0, sessionCount: 0 },
  codex: { activeSeconds: 0, sessionCount: 0 }
};

const mapDailyStatsToAIToolStats = (dailyStats: AIToolDailyStat[]): AIToolStats => {
  const stats: AIToolStats = {
    claude: { activeSeconds: 0, sessionCount: 0 },
    codex: { activeSeconds: 0, sessionCount: 0 }
  };

  for (const stat of dailyStats) {
    if (!stats[stat.id]) {
      continue;
    }

    stats[stat.id] = {
      activeSeconds: stat.activeSeconds,
      sessionCount: stat.sessionCount
    };
  }

  return stats;
};

export const App = (): React.JSX.Element => {
  const [status, setStatus] = React.useState<TrackerStatus>({
    running: true,
    paused: false,
    idle: false,
    currentApp: null,
    idleSeconds: 0
  });
  const [todaySummary, setTodaySummary] = React.useState<SummaryStats>(emptySummary);
  const [weekSummary, setWeekSummary] = React.useState<SummaryStats>(emptySummary);
  const [topApps, setTopApps] = React.useState<TopAppStat[]>([]);
  const [aiProcesses, setAiProcesses] = React.useState<AIToolProcess[]>([]);
  const [aiStats, setAiStats] = React.useState<AIToolStats>(emptyAIToolStats);
  const [settings, setSettings] = React.useState<AppSettings>({ idleThresholdSeconds: 300, launchAtLogin: true });
  const [draftIdle, setDraftIdle] = React.useState('300');
  const [draftLaunchAtLogin, setDraftLaunchAtLogin] = React.useState(true);
  const [settingsOpen, setSettingsOpen] = React.useState(false);
  const [dataLoaded, setDataLoaded] = React.useState(false);

  const loadStatus = React.useCallback(async () => {
    const next = await window.arkwatch.tracker.getStatus();
    setStatus(next);
  }, []);

  const loadData = React.useCallback(async () => {
    const now = new Date();
    const todayFrom = startOfDay(now).toISOString();
    const todayTo = endOfDay(now).toISOString();
    const weekFrom = startOfDay(subDays(now, 6)).toISOString();
    const weekTo = endOfDay(now).toISOString();

    const [today, week, apps] = await Promise.all([
      window.arkwatch.stats.getSummary({ from: todayFrom, to: todayTo }),
      window.arkwatch.stats.getSummary({ from: weekFrom, to: weekTo }),
      window.arkwatch.stats.getTopApps({ from: weekFrom, to: weekTo, limit: 10 })
    ]);

    setTodaySummary(today);
    setWeekSummary(week);
    setTopApps(apps);
  }, []);

  const loadAIStats = React.useCallback(async () => {
    const now = new Date();
    const todayFrom = startOfDay(now).toISOString();
    const todayTo = endOfDay(now).toISOString();
    const dailyStats = await window.arkwatch.stats.getAIToolDailyStats({ from: todayFrom, to: todayTo });
    setAiStats(mapDailyStatsToAIToolStats(dailyStats));
  }, []);

  const loadProcesses = React.useCallback(async () => {
    const processes = await window.arkwatch.processes.getAITools();
    setAiProcesses(processes);
  }, []);

  const loadSettings = React.useCallback(async () => {
    const nextSettings = await window.arkwatch.settings.get();
    setSettings(nextSettings);
    setDraftIdle(String(nextSettings.idleThresholdSeconds));
    setDraftLaunchAtLogin(nextSettings.launchAtLogin);
  }, []);

  React.useEffect(() => {
    void Promise.all([loadStatus(), loadData(), loadAIStats(), loadProcesses(), loadSettings()]).then(() => {
      setDataLoaded(true);
    });

    const statusTimer = window.setInterval(() => {
      void loadStatus();
    }, 1000);

    const dataTimer = window.setInterval(() => {
      void loadData();
      void loadAIStats();
    }, 10_000);

    const processTimer = window.setInterval(() => {
      void loadProcesses();
    }, 5_000);

    return () => {
      window.clearInterval(statusTimer);
      window.clearInterval(dataTimer);
      window.clearInterval(processTimer);
    };
  }, [loadAIStats, loadData, loadProcesses, loadSettings, loadStatus]);

  const toggleTracking = async (): Promise<void> => {
    const next = await window.arkwatch.tracker.toggle();
    setStatus(next);
    await loadData();
    await loadAIStats();
  };

  const saveSettings = async (): Promise<void> => {
    const idleThresholdSeconds = Number.parseInt(draftIdle, 10);
    const updated = await window.arkwatch.settings.update({
      idleThresholdSeconds: Number.isNaN(idleThresholdSeconds) ? settings.idleThresholdSeconds : idleThresholdSeconds,
      launchAtLogin: draftLaunchAtLogin
    });
    setSettings(updated);
    setSettingsOpen(false);
  };

  const chartData = React.useMemo(
    () =>
      weekSummary.days.map((day) => ({
        day: format(new Date(day.date), 'EEE'),
        activeHours: Number((day.activeSeconds / 3600).toFixed(2)),
        idleHours: Number((day.idleSeconds / 3600).toFixed(2))
      })),
    [weekSummary.days]
  );

  const isClaudeRunning = aiProcesses.find((p) => p.id === 'claude')?.running ?? false;
  const isCodexRunning = aiProcesses.find((p) => p.id === 'codex')?.running ?? false;

  const dailyGoalSeconds = 8 * 3600;

  return (
    <TooltipProvider>
      <div className="window-chrome flex flex-col">
        <TitleBar />

        <main className="main-scroll flex-1 p-6">
          {!dataLoaded ? (
            <DashboardSkeleton />
          ) : (
          <div className="mx-auto flex max-w-5xl flex-col gap-5">
            {/* Status Row */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <span className="inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-medium">
                      <span
                        className="h-1.5 w-1.5 rounded-full"
                        style={{
                          background: status.paused ? '#9ca3af' : status.idle ? '#f59e0b' : '#22c55e'
                        }}
                      />
                      {status.paused ? 'Paused' : status.idle ? `Idle ${idleLabel(status.idleSeconds)}` : 'Tracking'}
                    </span>
                  </TooltipTrigger>
                  <TooltipContent>
                    {status.currentApp ? `Foreground: ${status.currentApp}` : 'Waiting for app activity'}
                  </TooltipContent>
                </Tooltip>
              </div>

              <div className="flex items-center gap-2">
                <Button onClick={() => void toggleTracking()} variant="ghost" size="sm">
                  {status.paused ? <PlayCircle className="mr-1.5 h-3.5 w-3.5" /> : <PauseCircle className="mr-1.5 h-3.5 w-3.5" />}
                  {status.paused ? 'Resume' : 'Pause'}
                </Button>

                <Dialog open={settingsOpen} onOpenChange={setSettingsOpen}>
                  <DialogTrigger asChild>
                    <Button variant="ghost" size="icon">
                      <Settings2 className="h-4 w-4" />
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Settings</DialogTitle>
                      <DialogDescription>Stored locally in SQLite.</DialogDescription>
                    </DialogHeader>

                    <div className="grid gap-4">
                      <label className="grid gap-1.5 text-sm font-medium" htmlFor="idle-threshold">
                        Idle threshold (seconds)
                        <Input
                          id="idle-threshold"
                          type="number"
                          min={60}
                          max={1800}
                          value={draftIdle}
                          onChange={(event) => setDraftIdle(event.target.value)}
                        />
                      </label>

                      <label className="inline-flex items-center gap-2.5 text-sm font-medium" htmlFor="launch-login">
                        <input
                          id="launch-login"
                          type="checkbox"
                          checked={draftLaunchAtLogin}
                          onChange={(event) => setDraftLaunchAtLogin(event.target.checked)}
                          className="h-4 w-4 rounded border accent-[hsl(var(--accent))]"
                        />
                        Launch at Windows startup
                      </label>
                    </div>

                    <DialogFooter>
                      <Button variant="ghost" onClick={() => setSettingsOpen(false)}>Cancel</Button>
                      <Button onClick={() => void saveSettings()}>Save</Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </div>
            </div>

            {/* AI Tools - always show both in a row */}
            <section>
              <h2 className="mb-2 text-xs font-medium text-[hsl(var(--muted))]">AI Tools</h2>
              <div className="grid gap-3 sm:grid-cols-2">
                <AIToolCard
                  config={AI_TOOLS.claude}
                  activeSeconds={aiStats.claude.activeSeconds}
                  sessionCount={aiStats.claude.sessionCount}
                  isRunning={isClaudeRunning}
                />
                <AIToolCard
                  config={AI_TOOLS.codex}
                  activeSeconds={aiStats.codex.activeSeconds}
                  sessionCount={aiStats.codex.sessionCount}
                  isRunning={isCodexRunning}
                />
              </div>
            </section>

            {/* Stats + Radial */}
            <div className="grid gap-4 lg:grid-cols-3">
              <div className="grid gap-4 sm:grid-cols-2 lg:col-span-2">
                <StatCard
                  label="Today Active"
                  value={formatDuration(todaySummary.totalActiveSeconds)}
                  sublabel="Foreground app usage"
                />
                <StatCard
                  label="Today Idle"
                  value={formatDuration(todaySummary.totalIdleSeconds)}
                  sublabel={`Threshold: ${settings.idleThresholdSeconds}s`}
                />
                <StatCard
                  label="Week Total"
                  value={formatDuration(weekSummary.totalActiveSeconds)}
                  sublabel="Last 7 days active"
                />
                <StatCard
                  label="Week Idle"
                  value={formatDuration(weekSummary.totalIdleSeconds)}
                  sublabel="Last 7 days idle"
                />
              </div>

              <div className="flex items-center justify-center rounded-lg border bg-white p-5 shadow-sm">
                <RadialChart
                  activeSeconds={todaySummary.totalActiveSeconds}
                  idleSeconds={todaySummary.totalIdleSeconds}
                  goalSeconds={dailyGoalSeconds}
                />
              </div>
            </div>

            {/* Charts row: bar + area */}
            <div className="grid gap-4 lg:grid-cols-2">
              <div className="rounded-lg border bg-white p-5 shadow-sm">
                <p className="mb-3 text-xs font-medium text-[hsl(var(--muted))]">Weekly Activity</p>
                <WeeklyChart data={chartData} />
              </div>

              <div className="rounded-lg border bg-white p-5 shadow-sm">
                <p className="mb-3 text-xs font-medium text-[hsl(var(--muted))]">Top Apps by Usage</p>
                <ActivityLineChart apps={topApps} />
              </div>
            </div>

            {/* Top Apps */}
            <section>
              <h2 className="mb-2 text-xs font-medium text-[hsl(var(--muted))]">Top Apps (7 days)</h2>
              <div className="rounded-lg border bg-white shadow-sm">
                <TopAppsTable apps={topApps} />
              </div>
            </section>
          </div>
          )}
        </main>
      </div>
    </TooltipProvider>
  );
};
