import type { ProgressInfo } from 'electron-updater';
export type { ProgressInfo };

export type DateRange = {
  from: string;
  to: string;
};

export type AppLimit = {
  id: number;
  appName: string;
  exePath: string | null;
  dailyLimitSeconds: number;
  enabled: boolean;
  createdAt: string;
};

export type AppLimitStatus = {
  appName: string;
  dailyLimitSeconds: number;
  usedSeconds: number;
  exceeded: boolean;
};

export type FocusSessionState = {
  active: boolean;
  remainingSeconds: number;
  plannedDurationSec: number;
  elapsedSeconds: number;
  label: string | null;
};

export type FocusSessionRecord = {
  id: number;
  startedAt: string;
  endedAt: string | null;
  plannedDurationSec: number;
  actualDurationSec: number | null;
  completed: boolean;
  label: string | null;
};

export type FocusSchedule = {
  id: number;
  label: string;
  daysOfWeek: string;
  startTime: string;
  endTime: string;
  enabled: boolean;
  createdAt: string;
};

export type TrackerStatus = {
  running: boolean;
  paused: boolean;
  idle: boolean;
  currentApp: string | null;
  idleSeconds: number;
};

export type TopAppStat = {
  appName: string;
  exePath: string | null;
  activeSeconds: number;
};

export type AIToolDailyStat = {
  id: 'claude' | 'codex';
  activeSeconds: number;
  sessionCount: number;
};

export type DailyStat = {
  date: string;
  activeSeconds: number;
  idleSeconds: number;
};

export type SummaryStats = {
  totalActiveSeconds: number;
  totalIdleSeconds: number;
  totalTrackedSeconds: number;
  days: DailyStat[];
};

export type ThemeSetting = 'light' | 'dark';

export type AppSettings = {
  idleThresholdSeconds: number;
  launchAtLogin: boolean;
  theme: ThemeSetting;
  dailyGoalHours: number;
  minimizeToTray: boolean;
  dailyGoalNotification: boolean;
  autoCheckUpdates: boolean;
  breakReminderEnabled: boolean;
  breakReminderIntervalMinutes: number;
};

export type SessionInput = {
  appName: string;
  exePath: string | null;
  startedAt: string;
  endedAt: string;
  durationSec: number;
  isIdleSegment: boolean;
  source: string;
};

export type AIToolProcess = {
  id: string;
  name: string;
  running: boolean;
};

export type ManualUpdateCheckResult =
  | { status: 'available'; version: string }
  | { status: 'not-available'; version: string }
  | { status: 'unavailable'; reason: string }
  | { status: 'error'; message: string };

export type ArkWatchApi = {
  tracker: {
    getStatus: () => Promise<TrackerStatus>;
    pause: () => Promise<TrackerStatus>;
    resume: () => Promise<TrackerStatus>;
    toggle: () => Promise<TrackerStatus>;
    onStatusChanged: (callback: (status: TrackerStatus) => void) => () => void;
  };
  stats: {
    getSummary: (range: DateRange) => Promise<SummaryStats>;
    getTopApps: (params: DateRange & { limit: number }) => Promise<TopAppStat[]>;
    getAIToolDailyStats: (range: DateRange) => Promise<AIToolDailyStat[]>;
  };
  settings: {
    get: () => Promise<AppSettings>;
    update: (settings: Partial<AppSettings>) => Promise<AppSettings>;
  };
  processes: {
    getAITools: () => Promise<AIToolProcess[]>;
    pollNow: () => Promise<AIToolProcess[]>;
    onChanged: (callback: (processes: AIToolProcess[]) => void) => () => void;
  };
  icons: {
    getAppIcon: (params: { appName: string; exePath: string | null }) => Promise<string | null>;
    getAppInstallState: (params: { appName: string; exePath: string | null }) => Promise<boolean>;
  };
  focus: {
    getState: () => Promise<FocusSessionState>;
    start: (params: { durationSec: number; label?: string }) => Promise<FocusSessionState>;
    stop: () => Promise<FocusSessionState>;
    getTodayCount: () => Promise<number>;
    onStateChanged: (callback: (state: FocusSessionState) => void) => () => void;
  };
  appLimits: {
    getAll: () => Promise<AppLimit[]>;
    upsert: (limit: Omit<AppLimit, 'id' | 'createdAt'>) => Promise<AppLimit[]>;
    remove: (id: number) => Promise<AppLimit[]>;
    getStatuses: () => Promise<AppLimitStatus[]>;
    onExceeded: (callback: (status: AppLimitStatus) => void) => () => void;
  };
  focusSchedules: {
    getAll: () => Promise<FocusSchedule[]>;
    create: (schedule: Omit<FocusSchedule, 'id' | 'createdAt'>) => Promise<FocusSchedule[]>;
    update: (schedule: FocusSchedule) => Promise<FocusSchedule[]>;
    remove: (id: number) => Promise<FocusSchedule[]>;
  };
  breakReminder: {
    onNotify: (callback: () => void) => () => void;
  };
  updater: {
    checkNow: () => Promise<ManualUpdateCheckResult>;
    onDownloadProgress: (callback: (progress: ProgressInfo) => void) => () => void;
  };
  window: {
    minimize: () => void;
    maximize: () => void;
    close: () => void;
    onRestoredFromTray: (callback: () => void) => () => void;
  };
};
