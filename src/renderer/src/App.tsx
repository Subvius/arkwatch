import * as React from 'react';
import { endOfDay, format, startOfDay, subDays } from 'date-fns';
import { PauseCircle, PlayCircle, RefreshCw, Settings } from 'lucide-react';
import githubLogo from './assets/github-dark-logo.svg';
import type { AIToolDailyStat, AIToolProcess, AppLimit, AppSettings, FocusSchedule, FocusSessionState, ManualUpdateCheckResult, SummaryStats, TopAppStat, TrackerStatus, ProgressInfo, ThemeSetting } from '../../shared/types';
import { formatDuration } from './lib/utils';
import { getAITools, type AIToolId } from './lib/ai-tools';
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
import { MascotHeader } from './components/MascotHeader';
import { UsageWidgets } from './components/UsageWidgets';
import { FocusWidget } from './components/FocusWidget';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './components/ui/tabs';
import { isBrowserApp } from './lib/browser-detection';
import type { ElephantMascotHandle, IdleMode } from './components/ElephantMascot';

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

const formatBytes = (value: number): string => {
  if (!Number.isFinite(value) || value <= 0) {
    return '0 B';
  }

  const units = ['B', 'KB', 'MB', 'GB'];
  let size = value;
  let unitIndex = 0;

  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024;
    unitIndex += 1;
  }

  const precision = size >= 10 || unitIndex === 0 ? 0 : 1;
  return `${size.toFixed(precision)} ${units[unitIndex]}`;
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

const getDomTheme = (): ThemeSetting => (document.documentElement.classList.contains('dark') ? 'dark' : 'light');

const applyThemeToDocument = (theme: ThemeSetting): void => {
  document.documentElement.classList.toggle('dark', theme === 'dark');
  localStorage.setItem('theme', theme);
};

type SettingsTab = 'general' | 'notifications' | 'app-limits' | 'focus-schedule';

const AppLimitsSettings = React.lazy(async () => ({
  default: (await import('./components/settings/AppLimitsSettings')).AppLimitsSettings
}));

const FocusScheduleSettings = React.lazy(async () => ({
  default: (await import('./components/settings/FocusScheduleSettings')).FocusScheduleSettings
}));

const SettingsPanelFallback = ({ label }: { label: string }): React.JSX.Element => (
  <div className="rounded-lg border border-dashed border-[hsl(var(--border))] p-4 text-sm text-[hsl(var(--muted))]">
    {`Loading ${label}...`}
  </div>
);

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
  const [focusState, setFocusState] = React.useState<FocusSessionState>({
    active: false, remainingSeconds: 0, plannedDurationSec: 0, elapsedSeconds: 0, label: null
  });
  const [focusTodayCount, setFocusTodayCount] = React.useState(0);
  const [appLimits, setAppLimits] = React.useState<AppLimit[]>([]);
  const [focusSchedules, setFocusSchedules] = React.useState<FocusSchedule[]>([]);
  const [appLimitsLoaded, setAppLimitsLoaded] = React.useState(false);
  const [focusSchedulesLoaded, setFocusSchedulesLoaded] = React.useState(false);
  const [settings, setSettings] = React.useState<AppSettings>({
    idleThresholdSeconds: 300, launchAtLogin: true, theme: getDomTheme(),
    dailyGoalHours: 8, minimizeToTray: true, dailyGoalNotification: true,
    autoCheckUpdates: true, breakReminderEnabled: true, breakReminderIntervalMinutes: 90
  });
  const [draftIdle, setDraftIdle] = React.useState('300');
  const [draftLaunchAtLogin, setDraftLaunchAtLogin] = React.useState(true);
  const [draftDailyGoalHours, setDraftDailyGoalHours] = React.useState('8');
  const [draftMinimizeToTray, setDraftMinimizeToTray] = React.useState(true);
  const [draftDailyGoalNotification, setDraftDailyGoalNotification] = React.useState(true);
  const [draftAutoCheckUpdates, setDraftAutoCheckUpdates] = React.useState(true);
  const [draftBreakReminderEnabled, setDraftBreakReminderEnabled] = React.useState(true);
  const [draftBreakReminderInterval, setDraftBreakReminderInterval] = React.useState('90');
  const [draftTheme, setDraftTheme] = React.useState<ThemeSetting>(getDomTheme());
  const [settingsOpen, setSettingsOpen] = React.useState(false);
  const [settingsTab, setSettingsTab] = React.useState<SettingsTab>('general');
  const [dataLoaded, setDataLoaded] = React.useState(false);
  const [idleMode, setIdleMode] = React.useState<IdleMode>('none');
  const [scheduledIdle, setScheduledIdle] = React.useState(false);
  const [isMedicMode, setIsMedicMode] = React.useState(false);
  const [updateDownloadProgress, setUpdateDownloadProgress] = React.useState<ProgressInfo | null>(null);
  const [isCheckingForUpdates, setIsCheckingForUpdates] = React.useState(false);
  const [updateCheckMessage, setUpdateCheckMessage] = React.useState<string | null>(null);
  const updatesDisabledInDev = window.location.protocol === 'http:';
  const medicTimerRef = React.useRef<number | null>(null);
  const lastIdleStateRef = React.useRef(false);
  const elephantRef = React.useRef<ElephantMascotHandle>(null);
  const prevAppRef = React.useRef<string | null>(null);
  const processStateVersionRef = React.useRef(0);
  const processPullRequestRef = React.useRef(0);

  // Track dark mode for theme-dependent configs
  const [isDark, setIsDark] = React.useState(document.documentElement.classList.contains('dark'));
  React.useEffect(() => {
    const update = (): void => setIsDark(document.documentElement.classList.contains('dark'));
    const observer = new MutationObserver(update);
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
    return () => observer.disconnect();
  }, []);

  const aiToolConfigs = React.useMemo(() => getAITools(isDark), [isDark]);

  // Track window focus for pausing mascot animations when app is in background.
  // Tray restore on Windows can miss a normal browser focus event, so sync from both
  // window focus and document visibility, and force a refresh after restore.
  const [appFocused, setAppFocused] = React.useState(true);
  const syncAppFocused = React.useCallback((): void => {
    if (document.visibilityState === 'hidden') {
      setAppFocused(false);
      return;
    }

    setAppFocused(document.hasFocus());
  }, []);

  React.useEffect(() => {
    const onFocus = (): void => setAppFocused(true);
    const onBlur = (): void => setAppFocused(false);
    const onVisibilityChange = (): void => {
      if (document.visibilityState === 'hidden') {
        setAppFocused(false);
        return;
      }

      window.setTimeout(syncAppFocused, 50);
    };

    window.addEventListener('focus', onFocus);
    window.addEventListener('blur', onBlur);
    document.addEventListener('visibilitychange', onVisibilityChange);

    const initialSync = window.setTimeout(syncAppFocused, 100);

    return () => {
      window.clearTimeout(initialSync);
      window.removeEventListener('focus', onFocus);
      window.removeEventListener('blur', onBlur);
      document.removeEventListener('visibilitychange', onVisibilityChange);
    };
  }, [syncAppFocused]);

  const loadStatus = React.useCallback(async () => {
    const next = await window.arkwatch.tracker.getStatus();
    setStatus((prev) => {
      if (prev.currentApp !== next.currentApp && prev.currentApp !== null) {
        prevAppRef.current = prev.currentApp;
      }
      return next;
    });
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
    const requestId = processPullRequestRef.current + 1;
    processPullRequestRef.current = requestId;
    const pushVersionAtRequest = processStateVersionRef.current;
    const processes = await window.arkwatch.processes.getAITools();

    if (requestId !== processPullRequestRef.current || pushVersionAtRequest < processStateVersionRef.current) {
      return;
    }

    setAiProcesses(processes);
  }, []);

  const loadSettings = React.useCallback(async () => {
    const nextSettings = await window.arkwatch.settings.get();
    applyThemeToDocument(nextSettings.theme);
    setSettings(nextSettings);
    setDraftIdle(String(nextSettings.idleThresholdSeconds));
    setDraftLaunchAtLogin(nextSettings.launchAtLogin);
    setDraftDailyGoalHours(String(nextSettings.dailyGoalHours));
    setDraftMinimizeToTray(nextSettings.minimizeToTray);
    setDraftDailyGoalNotification(nextSettings.dailyGoalNotification);
    setDraftAutoCheckUpdates(updatesDisabledInDev ? false : nextSettings.autoCheckUpdates);
    setDraftBreakReminderEnabled(nextSettings.breakReminderEnabled);
    setDraftBreakReminderInterval(String(nextSettings.breakReminderIntervalMinutes));
    setDraftTheme(nextSettings.theme);
  }, []);

  const loadFocusData = React.useCallback(async () => {
    const [state, count] = await Promise.all([
      window.arkwatch.focus.getState(),
      window.arkwatch.focus.getTodayCount()
    ]);
    setFocusState(state);
    setFocusTodayCount(count);
  }, []);

  const refreshLiveState = React.useCallback(async (markLoaded = false): Promise<void> => {
    const results = await Promise.allSettled([
      loadStatus(),
      loadData(),
      loadAIStats(),
      loadProcesses(),
      loadFocusData()
    ]);

    for (const result of results) {
      if (result.status === 'rejected') {
        console.error('[runtime] live refresh failed', result.reason);
      }
    }

    if (markLoaded) {
      setDataLoaded(true);
    }
  }, [loadAIStats, loadData, loadFocusData, loadProcesses, loadStatus]);

  const loadAppLimits = React.useCallback(async () => {
    const limits = await window.arkwatch.appLimits.getAll();
    setAppLimits(limits);
    setAppLimitsLoaded(true);
  }, []);

  const loadFocusSchedules = React.useCallback(async () => {
    const schedules = await window.arkwatch.focusSchedules.getAll();
    setFocusSchedules(schedules);
    setFocusSchedulesLoaded(true);
  }, []);

  React.useEffect(() => {
    void Promise.allSettled([loadSettings(), refreshLiveState(true)])
      .then((results) => {
        for (const result of results) {
          if (result.status === 'rejected') {
            console.error('[bootstrap] initial load failed', result.reason);
          }
        }
      });

    const dataTimer = window.setInterval(() => {
      void loadData();
      void loadAIStats();
    }, 30_000);

    const processTimer = window.setInterval(() => {
      void loadProcesses();
    }, 30_000);

    return () => {
      window.clearInterval(dataTimer);
      window.clearInterval(processTimer);
    };
  }, [loadAIStats, loadData, loadProcesses, loadSettings, refreshLiveState]);

  React.useEffect(() => {
    if (!settingsOpen) {
      return;
    }

    if (settingsTab === 'app-limits' && !appLimitsLoaded) {
      void loadAppLimits().catch((error: unknown) => {
        console.error('[settings] failed to load app limits', error);
      });
    }

    if (settingsTab === 'focus-schedule' && !focusSchedulesLoaded) {
      void loadFocusSchedules().catch((error: unknown) => {
        console.error('[settings] failed to load focus schedules', error);
      });
    }
  }, [appLimitsLoaded, focusSchedulesLoaded, loadAppLimits, loadFocusSchedules, settingsOpen, settingsTab]);

  const toggleTracking = async (): Promise<void> => {
    const next = await window.arkwatch.tracker.toggle();
    setStatus(next);
    await loadData();
    await loadAIStats();
  };

  const formatUpdateCheckMessage = (result: ManualUpdateCheckResult): string => {
    switch (result.status) {
      case 'available':
        return `Update ${result.version} found. Download started in the background.`;
      case 'not-available':
        return `You're already on the latest available version (${result.version}).`;
      case 'unavailable':
        return `Update checks are unavailable: ${result.reason}.`;
      case 'error':
        return `Update check failed: ${result.message}`;
    }
  };

  const checkForUpdates = async (): Promise<void> => {
    setIsCheckingForUpdates(true);
    setUpdateCheckMessage(null);

    try {
      const result = await window.arkwatch.updater.checkNow();
      setUpdateCheckMessage(formatUpdateCheckMessage(result));
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown update error';
      setUpdateCheckMessage(`Update check failed: ${message}`);
    } finally {
      setIsCheckingForUpdates(false);
    }
  };

  const saveSettings = async (): Promise<void> => {
    const idleThresholdSeconds = Number.parseInt(draftIdle, 10);
    const dailyGoalHours = Number.parseInt(draftDailyGoalHours, 10);
    const breakReminderIntervalMinutes = Number.parseInt(draftBreakReminderInterval, 10);
    const updated = await window.arkwatch.settings.update({
      idleThresholdSeconds: Number.isNaN(idleThresholdSeconds) ? settings.idleThresholdSeconds : idleThresholdSeconds,
      launchAtLogin: draftLaunchAtLogin,
      dailyGoalHours: Number.isNaN(dailyGoalHours) ? settings.dailyGoalHours : dailyGoalHours,
      minimizeToTray: draftMinimizeToTray,
      dailyGoalNotification: draftDailyGoalNotification,
      autoCheckUpdates: updatesDisabledInDev ? false : draftAutoCheckUpdates,
      breakReminderEnabled: draftBreakReminderEnabled,
      breakReminderIntervalMinutes: Number.isNaN(breakReminderIntervalMinutes) ? settings.breakReminderIntervalMinutes : breakReminderIntervalMinutes
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

  const headwear = React.useMemo((): 'none' | 'helmet' | 'nightcap' | 'medic' => {
    if (isClaudeRunning || isCodexRunning) return isMedicMode ? 'medic' : 'helmet';
    const hour = new Date().getHours();
    if (hour >= 23 || hour < 6) return 'nightcap';
    return 'none';
  }, [isClaudeRunning, isCodexRunning, isMedicMode]);

  const shouldSurf = React.useMemo((): boolean => {
    const app = status.currentApp;
    if (isBrowserApp(app)) return true;
    const isOurApp = app === 'ArkWatch' || app === 'Electron' || app === null;
    if (isOurApp) return isBrowserApp(prevAppRef.current);
    return false;
  }, [status.currentApp]);

  React.useEffect(() => {
    return window.arkwatch.window.onRestoredFromTray(() => {
      setAppFocused(true);
      elephantRef.current?.triggerGreeting();
      void refreshLiveState();
      window.setTimeout(syncAppFocused, 75);
    });
  }, [refreshLiveState, syncAppFocused]);

  React.useEffect(() => {
    return window.arkwatch.tracker.onStatusChanged((next) => {
      setStatus((prev) => {
        if (prev.currentApp !== next.currentApp && prev.currentApp !== null) {
          prevAppRef.current = prev.currentApp;
        }
        return next;
      });
    });
  }, []);

  React.useEffect(() => {
    const refresh = (): void => {
      void refreshLiveState();
    };

    window.addEventListener('focus', refresh);
    return () => {
      window.removeEventListener('focus', refresh);
    };
  }, [refreshLiveState]);

  React.useEffect(() => {
    return window.arkwatch.processes.onChanged((processes) => {
      processStateVersionRef.current += 1;
      setAiProcesses(processes);
    });
  }, []);

  React.useEffect(() => {
    return window.arkwatch.focus.onStateChanged((state) => {
      setFocusState(state);
      if (!state.active) {
        void window.arkwatch.focus.getTodayCount().then(setFocusTodayCount);
      }
    });
  }, []);

  React.useEffect(() => {
    return window.arkwatch.updater.onDownloadProgress((progress) => {
      setUpdateDownloadProgress(progress);
    });
  }, []);

  // Schedule checking (every 10s)
  React.useEffect(() => {
    const SCHEDULE: { start: [number, number]; end: [number, number]; mode: IdleMode }[] = [
      { start: [9, 0],   end: [9, 5],   mode: 'salad' },
      { start: [10, 15], end: [10, 20], mode: 'workout' },
      { start: [12, 0],  end: [12, 5],  mode: 'salad' },
      { start: [14, 50], end: [15, 0],  mode: 'sleep' },
      { start: [17, 50], end: [18, 0],  mode: 'workout' },
      { start: [20, 0],  end: [20, 5],  mode: 'salad' },
      { start: [23, 30], end: [6, 0],   mode: 'sleep' },
    ];

    function getScheduledIdle(now: Date): IdleMode {
      const t = now.getHours() * 60 + now.getMinutes();
      for (const { start, end, mode } of SCHEDULE) {
        const s = start[0] * 60 + start[1];
        const e = end[0] * 60 + end[1];
        if (e > s ? (t >= s && t < e) : (t >= s || t < e)) return mode;
      }
      return 'none';
    }

    const check = (): void => {
      if (!document.hasFocus()) return;
      const scheduled = getScheduledIdle(new Date());
      if (scheduled !== 'none') {
        setScheduledIdle(true);
        setIdleMode(scheduled);
        if (medicTimerRef.current) {
          clearInterval(medicTimerRef.current);
          medicTimerRef.current = null;
          setIsMedicMode(false);
        }
      } else {
        setScheduledIdle((prev) => {
          if (prev) setIdleMode('none');
          return false;
        });
      }
    };
    check();
    const timer = window.setInterval(check, 10_000);
    return () => window.clearInterval(timer);
  }, []);

  // App idle → random idle animation
  React.useEffect(() => {
    if (scheduledIdle) return;
    if (status.idle && !lastIdleStateRef.current) {
      const types: IdleMode[] = ['salad', 'sleep', 'workout'];
      setIdleMode(types[Math.floor(Math.random() * types.length)]);
    } else if (!status.idle && lastIdleStateRef.current) {
      setIdleMode('none');
    }
    lastIdleStateRef.current = status.idle;
  }, [status.idle, scheduledIdle]);

  // Medic mode (25% chance when AI running, re-rolls every 15 min)
  React.useEffect(() => {
    if (!(isClaudeRunning || isCodexRunning)) {
      setIsMedicMode(false);
      if (medicTimerRef.current) {
        clearInterval(medicTimerRef.current);
        medicTimerRef.current = null;
      }
      return;
    }
    const roll = (): void => { if (document.hasFocus()) setIsMedicMode(Math.random() < 0.25); };
    roll();
    medicTimerRef.current = window.setInterval(roll, 15 * 60 * 1000);
    return () => {
      if (medicTimerRef.current) {
        clearInterval(medicTimerRef.current);
        medicTimerRef.current = null;
      }
    };
  }, [isClaudeRunning, isCodexRunning]);

  const dailyGoalSeconds = settings.dailyGoalHours * 3600;
  const updatePercent = updateDownloadProgress ? Math.min(100, Math.max(0, updateDownloadProgress.percent)) : 0;
  const isUpdateDownloadComplete = updatePercent >= 100;
  const roundedUpdatePercent = Math.round(updatePercent);

  return (
    <TooltipProvider>
      <div className="window-chrome flex flex-col">
        <TitleBar />

        <main className="main-scroll flex-1 p-6">
          {!dataLoaded ? (
            <DashboardSkeleton />
          ) : (
          <div className="mx-auto flex max-w-5xl flex-col gap-5">
            <MascotHeader headwear={headwear} surfing={shouldSurf} idleMode={idleMode} scheduledIdle={scheduledIdle} appFocused={appFocused} elephantRef={elephantRef} />
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

                <Dialog open={settingsOpen} onOpenChange={(open) => {
                  setSettingsOpen(open);
                  if (!open) {
                    setUpdateCheckMessage(null);
                  }
                  if (open) {
                    setSettingsTab('general');
                    setDraftIdle(String(settings.idleThresholdSeconds));
                    setDraftLaunchAtLogin(settings.launchAtLogin);
                    setDraftDailyGoalHours(String(settings.dailyGoalHours));
                    setDraftMinimizeToTray(settings.minimizeToTray);
                    setDraftDailyGoalNotification(settings.dailyGoalNotification);
                    setDraftAutoCheckUpdates(updatesDisabledInDev ? false : settings.autoCheckUpdates);
                    setDraftBreakReminderEnabled(settings.breakReminderEnabled);
                    setDraftBreakReminderInterval(String(settings.breakReminderIntervalMinutes));
                    setDraftTheme(settings.theme);
                  }
                }}>
                  <DialogTrigger asChild>
                    <Button variant="ghost" size="icon">
                      <Settings className="h-4 w-4" />
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-h-[85vh] overflow-y-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden sm:max-w-lg">
                    <DialogHeader>
                      <DialogTitle className="flex items-center gap-2">
                        <Settings className="h-4 w-4 text-[hsl(var(--muted))]" />
                        Settings
                      </DialogTitle>
                      <DialogDescription>Configure your ArkWatch preferences.</DialogDescription>
                    </DialogHeader>

                    <Tabs value={settingsTab} onValueChange={(value) => setSettingsTab(value as SettingsTab)}>
                      <TabsList className="w-full">
                        <TabsTrigger value="general">General</TabsTrigger>
                        <TabsTrigger value="notifications">Alerts</TabsTrigger>
                        <TabsTrigger value="app-limits">Limits</TabsTrigger>
                        <TabsTrigger value="focus-schedule">Schedule</TabsTrigger>
                      </TabsList>

                      <TabsContent value="general">
                        <div className="grid gap-3">
                          <label className="grid gap-1.5 text-sm font-medium" htmlFor="daily-goal">
                            Daily goal (hours)
                            <Input
                              id="daily-goal"
                              type="number"
                              min={1}
                              max={24}
                              value={draftDailyGoalHours}
                              onChange={(e) => setDraftDailyGoalHours(e.target.value)}
                            />
                          </label>

                          <label className="grid gap-1.5 text-sm font-medium" htmlFor="idle-threshold">
                            Idle threshold (seconds)
                            <Input
                              id="idle-threshold"
                              type="number"
                              min={60}
                              max={1800}
                              value={draftIdle}
                              onChange={(e) => setDraftIdle(e.target.value)}
                            />
                          </label>

                          <label className="inline-flex items-center gap-2.5 text-sm font-medium" htmlFor="launch-login">
                            <input
                              id="launch-login"
                              type="checkbox"
                              checked={draftLaunchAtLogin}
                              onChange={(e) => setDraftLaunchAtLogin(e.target.checked)}
                              className="h-4 w-4 rounded border accent-[hsl(var(--accent))]"
                            />
                            Launch at Windows startup
                          </label>

                          <label className="inline-flex items-center gap-2.5 text-sm font-medium" htmlFor="minimize-tray">
                            <input
                              id="minimize-tray"
                              type="checkbox"
                              checked={draftMinimizeToTray}
                              onChange={(e) => setDraftMinimizeToTray(e.target.checked)}
                              className="h-4 w-4 rounded border accent-[hsl(var(--accent))]"
                            />
                            Minimize to tray on close
                          </label>
                        </div>
                      </TabsContent>

                      <TabsContent value="notifications">
                        <div className="grid gap-3">
                          <label className="inline-flex items-center gap-2.5 text-sm font-medium" htmlFor="goal-notification">
                            <input
                              id="goal-notification"
                              type="checkbox"
                              checked={draftDailyGoalNotification}
                              onChange={(e) => setDraftDailyGoalNotification(e.target.checked)}
                              className="h-4 w-4 rounded border accent-[hsl(var(--accent))]"
                            />
                            Notify when daily goal reached
                          </label>

                          <label className="inline-flex items-center gap-2.5 text-sm font-medium" htmlFor="auto-updates">
                            <input
                              id="auto-updates"
                              type="checkbox"
                              checked={draftAutoCheckUpdates}
                              onChange={(e) => setDraftAutoCheckUpdates(e.target.checked)}
                              disabled={updatesDisabledInDev}
                              className="h-4 w-4 rounded border accent-[hsl(var(--accent))]"
                            />
                            {updatesDisabledInDev ? 'Auto-check for updates (disabled in dev)' : 'Auto-check for updates'}
                          </label>

                          <div className="grid gap-2 rounded-lg border border-[hsl(var(--border))] p-3">
                            <div className="flex items-center justify-between gap-3">
                              <div className="space-y-0.5">
                                <p className="text-sm font-medium">Check for updates</p>
                                <p className="text-xs text-[hsl(var(--muted))]">Run a manual update check and get direct feedback.</p>
                              </div>
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() => void checkForUpdates()}
                                disabled={updatesDisabledInDev || isCheckingForUpdates}
                              >
                                <RefreshCw className={`mr-1.5 h-3.5 w-3.5 ${isCheckingForUpdates ? 'animate-spin' : ''}`} />
                                {isCheckingForUpdates ? 'Checking...' : 'Check now'}
                              </Button>
                            </div>
                            <p className="text-xs text-[hsl(var(--muted))]">
                              {updatesDisabledInDev ? 'Manual checks are disabled in development builds.' : updateCheckMessage ?? 'Use this even if automatic checks are turned off.'}
                            </p>
                          </div>

                          <div className="h-px bg-[hsl(var(--border))]" />

                          <label className="inline-flex items-center gap-2.5 text-sm font-medium" htmlFor="break-reminder">
                            <input
                              id="break-reminder"
                              type="checkbox"
                              checked={draftBreakReminderEnabled}
                              onChange={(e) => setDraftBreakReminderEnabled(e.target.checked)}
                              className="h-4 w-4 rounded border accent-[hsl(var(--accent))]"
                            />
                            Break reminders
                          </label>

                          {draftBreakReminderEnabled && (
                            <label className="grid gap-1.5 text-sm font-medium" htmlFor="break-interval">
                              Remind after (minutes)
                              <Input
                                id="break-interval"
                                type="number"
                                min={5}
                                max={480}
                                value={draftBreakReminderInterval}
                                onChange={(e) => setDraftBreakReminderInterval(e.target.value)}
                              />
                            </label>
                          )}
                        </div>
                      </TabsContent>

                      <TabsContent value="app-limits">
                        <React.Suspense fallback={<SettingsPanelFallback label="limits" />}>
                          {appLimitsLoaded ? (
                            <AppLimitsSettings
                              limits={appLimits}
                              onUpsert={async (limit) => {
                                const updated = await window.arkwatch.appLimits.upsert(limit);
                                setAppLimits(updated);
                                setAppLimitsLoaded(true);
                              }}
                              onRemove={async (id) => {
                                const updated = await window.arkwatch.appLimits.remove(id);
                                setAppLimits(updated);
                                setAppLimitsLoaded(true);
                              }}
                            />
                          ) : (
                            <SettingsPanelFallback label="limits" />
                          )}
                        </React.Suspense>
                      </TabsContent>

                      <TabsContent value="focus-schedule">
                        <React.Suspense fallback={<SettingsPanelFallback label="schedule" />}>
                          {focusSchedulesLoaded ? (
                            <FocusScheduleSettings
                              schedules={focusSchedules}
                              onCreate={async (schedule) => {
                                const updated = await window.arkwatch.focusSchedules.create(schedule);
                                setFocusSchedules(updated);
                                setFocusSchedulesLoaded(true);
                              }}
                              onUpdate={async (schedule) => {
                                const updated = await window.arkwatch.focusSchedules.update(schedule);
                                setFocusSchedules(updated);
                                setFocusSchedulesLoaded(true);
                              }}
                              onRemove={async (id) => {
                                const updated = await window.arkwatch.focusSchedules.remove(id);
                                setFocusSchedules(updated);
                                setFocusSchedulesLoaded(true);
                              }}
                            />
                          ) : (
                            <SettingsPanelFallback label="schedule" />
                          )}
                        </React.Suspense>
                      </TabsContent>

                    </Tabs>

                    <DialogFooter>
                      <Button variant="ghost" onClick={() => setSettingsOpen(false)}>Cancel</Button>
                      <Button onClick={() => void saveSettings()}>Save</Button>
                    </DialogFooter>

                    {/* — Footer: version + GitHub — */}
                    <div className="flex items-center justify-between border-t border-[hsl(var(--border))] pt-3 text-[11px] text-[hsl(var(--muted))]">
                      <span>v{__APP_VERSION__}</span>
                      <a
                        href="https://github.com/Subvius/arkwatch"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="opacity-50 transition-opacity hover:opacity-100"
                      >
                        <img src={githubLogo} alt="GitHub" className="h-4 w-4 dark:invert" />
                      </a>
                    </div>
                  </DialogContent>
                </Dialog>
              </div>
            </div>

            {updateDownloadProgress ? (
              <section className="cv-section">
                <div className="rounded-lg border bg-[hsl(var(--panel))] p-3 shadow-sm">
                  <div className="flex items-center justify-between text-xs font-medium">
                    <span>{isUpdateDownloadComplete ? 'Update ready to install' : 'Downloading update...'}</span>
                    <span>{roundedUpdatePercent}%</span>
                  </div>
                  <div className="mt-2 h-2 overflow-hidden rounded-full bg-[hsl(var(--border))]" role="progressbar" aria-label="Update download progress" aria-valuemin={0} aria-valuemax={100} aria-valuenow={roundedUpdatePercent} aria-valuetext={`${updatePercent.toFixed(1)} percent`}>
                    <div
                      aria-hidden="true"
                      className="h-full bg-[hsl(var(--accent))] transition-[width] duration-200"
                      style={{ width: `${updatePercent.toFixed(1)}%` }}
                    />
                  </div>
                  <p className="mt-1 text-[11px] text-[hsl(var(--muted))]">
                    {formatBytes(updateDownloadProgress.transferred)} / {formatBytes(updateDownloadProgress.total)} at {formatBytes(updateDownloadProgress.bytesPerSecond)}/s
                  </p>
                </div>
              </section>
            ) : null}

            {/* AI Tools - always show both in a row */}
            <section className="cv-section">
              <h2 className="mb-2 text-xs font-medium text-[hsl(var(--muted))]">AI Tools</h2>
              <div className="grid gap-3 sm:grid-cols-2">
                <AIToolCard
                  config={aiToolConfigs.claude}
                  activeSeconds={aiStats.claude.activeSeconds}
                  sessionCount={aiStats.claude.sessionCount}
                  isRunning={isClaudeRunning}
                />
                <AIToolCard
                  config={aiToolConfigs.codex}
                  activeSeconds={aiStats.codex.activeSeconds}
                  sessionCount={aiStats.codex.sessionCount}
                  isRunning={isCodexRunning}
                />
              </div>
            </section>

            {/* Focus Mode */}
            <FocusWidget
              focusState={focusState}
              todayCount={focusTodayCount}
              onStart={async (durationSec) => {
                const state = await window.arkwatch.focus.start({ durationSec });
                setFocusState(state);
              }}
              onStop={async () => {
                const state = await window.arkwatch.focus.stop();
                setFocusState(state);
                const count = await window.arkwatch.focus.getTodayCount();
                setFocusTodayCount(count);
              }}
            />

            {/* Stats + Radial */}
            <div className="cv-section grid gap-4 lg:grid-cols-3">
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

              <div className="flex items-center justify-center rounded-lg border bg-[hsl(var(--panel))] p-5 shadow-sm">
                <RadialChart
                  activeSeconds={todaySummary.totalActiveSeconds}
                  idleSeconds={todaySummary.totalIdleSeconds}
                  goalSeconds={dailyGoalSeconds}
                />
              </div>
            </div>

            {/* Charts row: bar + area */}
            <div className="cv-section grid gap-4 lg:grid-cols-2">
              <div className="rounded-lg border bg-[hsl(var(--panel))] p-5 shadow-sm">
                <p className="mb-3 text-xs font-medium text-[hsl(var(--muted))]">Weekly Activity</p>
                <WeeklyChart data={chartData} />
              </div>

              <div className="rounded-lg border bg-[hsl(var(--panel))] p-5 shadow-sm">
                <p className="mb-3 text-xs font-medium text-[hsl(var(--muted))]">Top Apps by Usage</p>
                <ActivityLineChart apps={topApps} />
              </div>
            </div>

            {/* Top Apps */}
            <section className="cv-section">
              <h2 className="mb-2 text-xs font-medium text-[hsl(var(--muted))]">Top Apps (7 days)</h2>
              <div className="rounded-lg border bg-[hsl(var(--panel))] shadow-sm">
                <TopAppsTable apps={topApps} />
              </div>
            </section>

            {/* Usage Summary Widgets */}
            <div className="cv-section">
              <UsageWidgets />
            </div>
          </div>
          )}
        </main>
      </div>
    </TooltipProvider>
  );
};




