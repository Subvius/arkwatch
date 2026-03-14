import { contextBridge, ipcRenderer } from 'electron';
import type { ArkWatchApi, AppLimit, AppSettings, DateRange, FocusSchedule, FocusSessionState, AppLimitStatus, ProgressInfo, TrackerStatus } from '../shared/types';
import { IPC_CHANNELS } from '../shared/ipc';

const api: ArkWatchApi = {
  tracker: {
    getStatus: () => ipcRenderer.invoke(IPC_CHANNELS.trackerGetStatus),
    pause: () => ipcRenderer.invoke(IPC_CHANNELS.trackerPause),
    resume: () => ipcRenderer.invoke(IPC_CHANNELS.trackerResume),
    toggle: () => ipcRenderer.invoke(IPC_CHANNELS.trackerToggle),
    onStatusChanged: (callback: (status: TrackerStatus) => void) => {
      const handler = (_event: unknown, status: TrackerStatus) => callback(status);
      ipcRenderer.on(IPC_CHANNELS.trackerStatusChanged, handler);
      return () => { ipcRenderer.removeListener(IPC_CHANNELS.trackerStatusChanged, handler); };
    }
  },
  stats: {
    getSummary: (range: DateRange) => ipcRenderer.invoke(IPC_CHANNELS.statsGetSummary, range),
    getTopApps: (params: DateRange & { limit: number }) => ipcRenderer.invoke(IPC_CHANNELS.statsGetTopApps, params),
    getAIToolDailyStats: (range: DateRange) => ipcRenderer.invoke(IPC_CHANNELS.statsGetAIToolDailyStats, range)
  },
  settings: {
    get: () => ipcRenderer.invoke(IPC_CHANNELS.settingsGet),
    update: (settings: Partial<AppSettings>) => ipcRenderer.invoke(IPC_CHANNELS.settingsUpdate, settings)
  },
  processes: {
    getAITools: () => ipcRenderer.invoke(IPC_CHANNELS.processesGetAITools)
  },
  icons: {
    getAppIcon: (params: { appName: string; exePath: string | null }) => ipcRenderer.invoke(IPC_CHANNELS.iconsGetAppIcon, params)
  },
  focus: {
    getState: () => ipcRenderer.invoke(IPC_CHANNELS.focusGetState),
    start: (params: { durationSec: number; label?: string }) => ipcRenderer.invoke(IPC_CHANNELS.focusStart, params),
    stop: () => ipcRenderer.invoke(IPC_CHANNELS.focusStop),
    getTodayCount: () => ipcRenderer.invoke(IPC_CHANNELS.focusGetTodayCount),
    onStateChanged: (callback: (state: FocusSessionState) => void) => {
      const handler = (_event: unknown, state: FocusSessionState) => callback(state);
      ipcRenderer.on(IPC_CHANNELS.focusStateChanged, handler);
      return () => { ipcRenderer.removeListener(IPC_CHANNELS.focusStateChanged, handler); };
    }
  },
  appLimits: {
    getAll: () => ipcRenderer.invoke(IPC_CHANNELS.appLimitsGetAll),
    upsert: (limit: Omit<AppLimit, 'id' | 'createdAt'>) => ipcRenderer.invoke(IPC_CHANNELS.appLimitsUpsert, limit),
    remove: (id: number) => ipcRenderer.invoke(IPC_CHANNELS.appLimitsRemove, id),
    getStatuses: () => ipcRenderer.invoke(IPC_CHANNELS.appLimitsGetStatuses),
    onExceeded: (callback: (status: AppLimitStatus) => void) => {
      const handler = (_event: unknown, status: AppLimitStatus) => callback(status);
      ipcRenderer.on(IPC_CHANNELS.appLimitsExceeded, handler);
      return () => { ipcRenderer.removeListener(IPC_CHANNELS.appLimitsExceeded, handler); };
    }
  },
  focusSchedules: {
    getAll: () => ipcRenderer.invoke(IPC_CHANNELS.focusSchedulesGetAll),
    create: (schedule: Omit<FocusSchedule, 'id' | 'createdAt'>) => ipcRenderer.invoke(IPC_CHANNELS.focusSchedulesCreate, schedule),
    update: (schedule: FocusSchedule) => ipcRenderer.invoke(IPC_CHANNELS.focusSchedulesUpdate, schedule),
    remove: (id: number) => ipcRenderer.invoke(IPC_CHANNELS.focusSchedulesRemove, id)
  },
  breakReminder: {
    onNotify: (callback: () => void) => {
      const handler = () => callback();
      ipcRenderer.on(IPC_CHANNELS.breakReminderNotify, handler);
      return () => { ipcRenderer.removeListener(IPC_CHANNELS.breakReminderNotify, handler); };
    }
  },
  updater: {
    onDownloadProgress: (callback: (progress: ProgressInfo) => void) => {
      const handler = (_event: unknown, progress: ProgressInfo) => callback(progress);
      ipcRenderer.on(IPC_CHANNELS.updaterDownloadProgress, handler);
      return () => { ipcRenderer.removeListener(IPC_CHANNELS.updaterDownloadProgress, handler); };
    }
  },
  window: {
    minimize: () => ipcRenderer.send(IPC_CHANNELS.windowMinimize),
    maximize: () => ipcRenderer.send(IPC_CHANNELS.windowMaximize),
    close: () => ipcRenderer.send(IPC_CHANNELS.windowClose),
    onRestoredFromTray: (callback: () => void) => {
      const handler = () => callback();
      ipcRenderer.on(IPC_CHANNELS.windowRestoredFromTray, handler);
      return () => { ipcRenderer.removeListener(IPC_CHANNELS.windowRestoredFromTray, handler); };
    }
  }
};

contextBridge.exposeInMainWorld('arkwatch', api);


