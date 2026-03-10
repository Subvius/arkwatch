import * as React from 'react';
import { endOfDay, format, startOfDay, subDays } from 'date-fns';
import { Activity, PauseCircle, PlayCircle, Settings2 } from 'lucide-react';
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip as RechartsTooltip, XAxis, YAxis } from 'recharts';
import type { AppSettings, SummaryStats, TopAppStat, TrackerStatus } from '../../shared/types';
import { formatDuration } from './lib/utils';
import { Button } from './components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from './components/ui/dialog';
import { Input } from './components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './components/ui/tabs';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from './components/ui/tooltip';

const emptySummary: SummaryStats = {
  totalActiveSeconds: 0,
  totalIdleSeconds: 0,
  totalTrackedSeconds: 0,
  days: []
};

const idleLabel = (idleSeconds: number): string => {
  if (idleSeconds < 60) {
    return `${idleSeconds}s`;
  }

  return `${Math.floor(idleSeconds / 60)}m`;
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
  const [settings, setSettings] = React.useState<AppSettings>({ idleThresholdSeconds: 300, launchAtLogin: true });
  const [draftIdle, setDraftIdle] = React.useState('300');
  const [draftLaunchAtLogin, setDraftLaunchAtLogin] = React.useState(true);
  const [settingsOpen, setSettingsOpen] = React.useState(false);

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
      window.arkwatch.stats.getTopApps({ from: weekFrom, to: weekTo, limit: 8 })
    ]);

    setTodaySummary(today);
    setWeekSummary(week);
    setTopApps(apps);
  }, []);

  const loadSettings = React.useCallback(async () => {
    const nextSettings = await window.arkwatch.settings.get();
    setSettings(nextSettings);
    setDraftIdle(String(nextSettings.idleThresholdSeconds));
    setDraftLaunchAtLogin(nextSettings.launchAtLogin);
  }, []);

  React.useEffect(() => {
    void Promise.all([loadStatus(), loadData(), loadSettings()]);

    const statusTimer = window.setInterval(() => {
      void loadStatus();
    }, 1000);

    const dataTimer = window.setInterval(() => {
      void loadData();
    }, 10_000);

    return () => {
      window.clearInterval(statusTimer);
      window.clearInterval(dataTimer);
    };
  }, [loadData, loadSettings, loadStatus]);

  const toggleTracking = async (): Promise<void> => {
    const next = await window.arkwatch.tracker.toggle();
    setStatus(next);
    await loadData();
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
        activeHours: Number((day.activeSeconds / 3600).toFixed(2))
      })),
    [weekSummary.days]
  );

  return (
    <TooltipProvider>
      <main className="mx-auto flex w-full max-w-7xl flex-col gap-6 p-6 lg:p-8">
        <header className="neo-panel relative overflow-hidden p-6">
          <div className="absolute -right-8 -top-8 h-24 w-24 rotate-12 border-4 border-[hsl(var(--line))] bg-[hsl(var(--accent))]" />
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-black/70">ArkWatch</p>
          <div className="mt-2 flex flex-wrap items-center justify-between gap-4">
            <div>
              <h1 className="text-4xl font-black uppercase leading-tight">Screen Time, Brutally Honest</h1>
              <p className="mt-2 text-sm text-black/70">All data stays local on this machine. No cloud. No telemetry.</p>
            </div>
            <div className="flex items-center gap-3">
              <Tooltip>
                <TooltipTrigger asChild>
                  <span className="neo-chip inline-flex items-center gap-2 text-xs">
                    <Activity className="h-4 w-4" />
                    {status.paused ? 'Paused' : status.idle ? `Idle ${idleLabel(status.idleSeconds)}` : 'Tracking'}
                  </span>
                </TooltipTrigger>
                <TooltipContent>
                  {status.currentApp ? `Foreground app: ${status.currentApp}` : 'Waiting for app activity'}
                </TooltipContent>
              </Tooltip>

              <Button onClick={() => void toggleTracking()} variant={status.paused ? 'default' : 'ghost'}>
                {status.paused ? <PlayCircle className="mr-2 h-4 w-4" /> : <PauseCircle className="mr-2 h-4 w-4" />}
                {status.paused ? 'Resume Tracking' : 'Pause Tracking'}
              </Button>

              <Dialog open={settingsOpen} onOpenChange={setSettingsOpen}>
                <DialogTrigger asChild>
                  <Button variant="ghost" size="sm">
                    <Settings2 className="mr-2 h-4 w-4" />
                    Settings
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Tracking Settings</DialogTitle>
                    <DialogDescription>Stored locally in SQLite and applied instantly.</DialogDescription>
                  </DialogHeader>

                  <div className="grid gap-4">
                    <label className="grid gap-2 text-sm font-semibold" htmlFor="idle-threshold">
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

                    <label className="inline-flex items-center gap-3 text-sm font-semibold" htmlFor="launch-login">
                      <input
                        id="launch-login"
                        type="checkbox"
                        checked={draftLaunchAtLogin}
                        onChange={(event) => setDraftLaunchAtLogin(event.target.checked)}
                        className="h-5 w-5 border-2 border-[hsl(var(--line))] accent-[hsl(var(--accent))]"
                      />
                      Launch at Windows startup
                    </label>
                  </div>

                  <DialogFooter>
                    <Button variant="ghost" onClick={() => setSettingsOpen(false)}>
                      Cancel
                    </Button>
                    <Button onClick={() => void saveSettings()}>Save</Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>
          </div>
        </header>

        <section className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardHeader>
              <CardDescription>Today Active</CardDescription>
              <CardTitle>{formatDuration(todaySummary.totalActiveSeconds)}</CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-black/75">Tracked foreground app usage today.</CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardDescription>Today Idle</CardDescription>
              <CardTitle>{formatDuration(todaySummary.totalIdleSeconds)}</CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-black/75">Detected idle segments at {settings.idleThresholdSeconds}s threshold.</CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardDescription>Current App</CardDescription>
              <CardTitle className="truncate">{status.currentApp ?? 'Waiting…'}</CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-black/75">Live foreground process sampled every second.</CardContent>
          </Card>
        </section>

        <Tabs defaultValue="week">
          <TabsList>
            <TabsTrigger value="week">Weekly Trend</TabsTrigger>
            <TabsTrigger value="apps">Top Apps</TabsTrigger>
          </TabsList>

          <TabsContent value="week">
            <Card>
              <CardHeader>
                <CardTitle>Last 7 Days</CardTitle>
                <CardDescription>Active hours by day</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-[320px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={chartData} margin={{ top: 12, right: 16, left: -20, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(20,20,20,0.2)" />
                      <XAxis dataKey="day" tick={{ fill: '#111' }} axisLine={{ stroke: '#111' }} tickLine={{ stroke: '#111' }} />
                      <YAxis tick={{ fill: '#111' }} axisLine={{ stroke: '#111' }} tickLine={{ stroke: '#111' }} />
                      <RechartsTooltip
                        contentStyle={{
                          border: '3px solid #111',
                          borderRadius: 2,
                          boxShadow: '6px 6px 0 #111',
                          background: '#fff8ef',
                          fontWeight: 700
                        }}
                      />
                      <Bar dataKey="activeHours" fill="#ef6a3a" stroke="#111" strokeWidth={3} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="apps">
            <Card>
              <CardHeader>
                <CardTitle>Top Apps (7 days)</CardTitle>
                <CardDescription>Foreground active time by process</CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>App</TableHead>
                      <TableHead>Executable</TableHead>
                      <TableHead className="text-right">Active Time</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {topApps.map((row) => (
                      <TableRow key={`${row.appName}-${row.exePath ?? 'none'}`}>
                        <TableCell className="font-semibold">{row.appName}</TableCell>
                        <TableCell className="max-w-[320px] truncate text-black/70">{row.exePath ?? 'N/A'}</TableCell>
                        <TableCell className="text-right font-bold">{formatDuration(row.activeSeconds)}</TableCell>
                      </TableRow>
                    ))}
                    {topApps.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={3} className="py-8 text-center text-black/60">
                          No tracked app activity yet.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>
    </TooltipProvider>
  );
};
