export type DateRange = {
  from: string;
  to: string;
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

export type AppSettings = {
  idleThresholdSeconds: number;
  launchAtLogin: boolean;
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

export type ArkWatchApi = {
  tracker: {
    getStatus: () => Promise<TrackerStatus>;
    pause: () => Promise<TrackerStatus>;
    resume: () => Promise<TrackerStatus>;
    toggle: () => Promise<TrackerStatus>;
  };
  stats: {
    getSummary: (range: DateRange) => Promise<SummaryStats>;
    getTopApps: (params: DateRange & { limit: number }) => Promise<TopAppStat[]>;
  };
  settings: {
    get: () => Promise<AppSettings>;
    update: (settings: Partial<AppSettings>) => Promise<AppSettings>;
  };
  processes: {
    getAITools: () => Promise<AIToolProcess[]>;
  };
  icons: {
    getAppIcon: (params: { appName: string; exePath: string | null }) => Promise<string | null>;
  };
  window: {
    minimize: () => void;
    maximize: () => void;
    close: () => void;
  };
};

