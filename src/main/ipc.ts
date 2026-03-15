import { existsSync } from 'node:fs';
import { app, BrowserWindow, ipcMain, nativeImage } from 'electron';
import type { AIToolProcess, AppSettings, DateRange, FocusSchedule, TrackerStatus } from '../shared/types';
import { ArkWatchDatabase } from './db/database';
import { ActivityTrackerService } from './tracker/activity-tracker-service';
import { IPC_CHANNELS } from '../shared/ipc';
import { BackgroundProcessTracker, scanBackgroundProcesses } from './tracker/process-scanner';
import { FocusService } from './focus/focus-service';
import { AppLimitChecker } from './focus/app-limit-checker';
import { checkForUpdatesNow } from './updater';
import { buildIconCandidates, type IconCandidate } from './lib/app-icon-resolver';

const iconByRequestKey = new Map<string, string | null>();
const iconByCandidateKey = new Map<string, string | null>();

const genericExeIconBySize = new Map<'large' | 'normal' | 'small', string | null>();

const getGenericExeIcon = async (size: 'large' | 'normal' | 'small'): Promise<string | null> => {
  if (genericExeIconBySize.has(size)) {
    return genericExeIconBySize.get(size) ?? null;
  }

  try {
    const icon = await app.getFileIcon('__arkwatch_missing_executable__.exe', { size });
    const dataUrl = icon.isEmpty() ? null : icon.toDataURL();
    genericExeIconBySize.set(size, dataUrl);
    return dataUrl;
  } catch {
    genericExeIconBySize.set(size, null);
    return null;
  }
};

const normalize = (value: string): string => value.trim().toLowerCase();
const toCandidateCacheKey = (candidate: IconCandidate): string => `${candidate.kind}:${candidate.path}`;

const mapProcessesForRenderer = (processes: Map<string, { name: string; running: boolean }>): AIToolProcess[] =>
  Array.from(processes.entries()).map(([id, info]) => ({
    id,
    name: info.name,
    running: info.running
  }));

export const registerIpcHandlers = (
  database: ArkWatchDatabase,
  tracker: ActivityTrackerService,
  onSettingsUpdated: (settings: AppSettings) => Promise<void>,
  onTrackerStatusChanged: () => void,
  getMainWindow?: () => BrowserWindow | null,
  focusService?: FocusService,
  appLimitChecker?: AppLimitChecker,
  bgTracker?: BackgroundProcessTracker
): void => {
  ipcMain.handle(IPC_CHANNELS.trackerGetStatus, () => {
    return tracker.getStatus();
  });

  ipcMain.handle(IPC_CHANNELS.trackerPause, async () => {
    return tracker.pause();
  });

  ipcMain.handle(IPC_CHANNELS.trackerResume, async () => {
    return tracker.resume();
  });

  ipcMain.handle(IPC_CHANNELS.trackerToggle, async () => {
    return tracker.toggle();
  });

  const sendTrackerStatus = (status: TrackerStatus): void => {
    onTrackerStatusChanged();

    if (!getMainWindow) {
      return;
    }

    const mainWindow = getMainWindow();
    if (!mainWindow || mainWindow.isDestroyed()) {
      return;
    }

    mainWindow.webContents.send(IPC_CHANNELS.trackerStatusChanged, status);
  };

  tracker.onStatusChanged((status) => {
    sendTrackerStatus(status);
  });

  const sendProcessesChanged = (processes: ReadonlyArray<AIToolProcess>): void => {
    if (!getMainWindow) {
      return;
    }

    const mainWindow = getMainWindow();
    if (!mainWindow || mainWindow.isDestroyed()) {
      return;
    }

    mainWindow.webContents.send(IPC_CHANNELS.processesChanged, processes);
  };

  bgTracker?.onProcessesChanged((processes) => {
    sendProcessesChanged(processes);
  });

  ipcMain.handle(IPC_CHANNELS.statsGetSummary, (_event, range: DateRange) => {
    return database.getSummary(range);
  });

  ipcMain.handle(IPC_CHANNELS.statsGetTopApps, (_event, params: DateRange & { limit: number }) => {
    return database.getTopApps(params, params.limit);
  });

  ipcMain.handle(IPC_CHANNELS.statsGetAIToolDailyStats, (_event, range: DateRange) => {
    return database.getAIToolDailyStats(range);
  });

  ipcMain.handle(IPC_CHANNELS.settingsGet, () => {
    return database.getSettings();
  });

  ipcMain.handle(IPC_CHANNELS.settingsUpdate, async (_event, nextSettings: Partial<AppSettings>) => {
    const updated = await database.updateSettings(nextSettings);

    tracker.setIdleThreshold(updated.idleThresholdSeconds);
    await onSettingsUpdated(updated);

    return updated;
  });

  ipcMain.handle(IPC_CHANNELS.updaterCheckNow, async () => {
    if (!getMainWindow) {
      return { status: 'unavailable', reason: 'Main window is not available.' } as const;
    }

    return checkForUpdatesNow(getMainWindow);
  });

  ipcMain.handle(IPC_CHANNELS.processesGetAITools, async () => {
    if (bgTracker) {
      return bgTracker.getProcessesSnapshot();
    }

    const processes = await scanBackgroundProcesses();
    if (processes === null) {
      throw new Error('AI process scan failed');
    }

    return mapProcessesForRenderer(processes);
  });

  ipcMain.handle(IPC_CHANNELS.processesPollNow, async () => {
    if (bgTracker) {
      return bgTracker.pollNow();
    }

    const processes = await scanBackgroundProcesses();
    if (processes === null) {
      throw new Error('AI process scan failed');
    }

    return mapProcessesForRenderer(processes);
  });

  ipcMain.handle(
    IPC_CHANNELS.iconsGetAppIcon,
    async (_event, params: { appName: string; exePath: string | null }) => {
      const appName = typeof params?.appName === 'string' ? params.appName : '';
      const exePath = typeof params?.exePath === 'string' ? params.exePath : null;

      const requestKey = `${normalize(appName)}|${normalize(exePath ?? '')}`;
      if (iconByRequestKey.has(requestKey)) {
        return iconByRequestKey.get(requestKey) ?? null;
      }

      const candidates = buildIconCandidates(appName, exePath);
      const iconSizes: Array<'large' | 'normal' | 'small'> = ['large', 'normal', 'small'];

      for (const candidate of candidates) {
        const candidateKey = toCandidateCacheKey(candidate);
        if (iconByCandidateKey.has(candidateKey)) {
          const cached = iconByCandidateKey.get(candidateKey) ?? null;
          if (cached) {
            iconByRequestKey.set(requestKey, cached);
            return cached;
          }
          continue;
        }

        const looksLikePath = candidate.path.includes('\\') || candidate.path.includes('/');
        if (looksLikePath && !existsSync(candidate.path)) {
          iconByCandidateKey.set(candidateKey, null);
          continue;
        }

        try {
          let resolvedIcon: string | null = null;

          if (candidate.kind === 'image-file') {
            const icon = nativeImage.createFromPath(candidate.path);
            resolvedIcon = icon.isEmpty() ? null : icon.toDataURL();
          } else {
            for (const size of iconSizes) {
              const icon = await app.getFileIcon(candidate.path, { size });
              if (icon.isEmpty()) {
                continue;
              }

              const dataUrl = icon.toDataURL();
              const genericExeIcon = await getGenericExeIcon(size);
              if (genericExeIcon && dataUrl === genericExeIcon) {
                continue;
              }

              resolvedIcon = dataUrl;
              break;
            }
          }

          iconByCandidateKey.set(candidateKey, resolvedIcon);

          if (resolvedIcon) {
            iconByRequestKey.set(requestKey, resolvedIcon);
            return resolvedIcon;
          }
        } catch {
          iconByCandidateKey.set(candidateKey, null);
        }
      }

      iconByRequestKey.set(requestKey, null);
      return null;
    }
  );

  // --- Focus ---
  ipcMain.handle(IPC_CHANNELS.focusGetState, () => {
    return focusService?.getState() ?? { active: false, remainingSeconds: 0, plannedDurationSec: 0, elapsedSeconds: 0, label: null };
  });

  ipcMain.handle(IPC_CHANNELS.focusStart, async (_event, params: { durationSec: number; label?: string }) => {
    if (!focusService) throw new Error('Focus service not available');
    return focusService.start(params.durationSec, params.label);
  });

  ipcMain.handle(IPC_CHANNELS.focusStop, async () => {
    if (!focusService) throw new Error('Focus service not available');
    return focusService.stop();
  });

  ipcMain.handle(IPC_CHANNELS.focusGetTodayCount, async () => {
    return focusService?.getTodayCount() ?? 0;
  });

  // --- App Limits ---
  ipcMain.handle(IPC_CHANNELS.appLimitsGetAll, async () => {
    return database.getAppLimits();
  });

  ipcMain.handle(IPC_CHANNELS.appLimitsUpsert, async (_event, limit: { appName: string; exePath: string | null; dailyLimitSeconds: number; enabled: boolean }) => {
    await database.upsertAppLimit(limit);
    return database.getAppLimits();
  });

  ipcMain.handle(IPC_CHANNELS.appLimitsRemove, async (_event, id: number) => {
    await database.removeAppLimit(id);
    return database.getAppLimits();
  });

  ipcMain.handle(IPC_CHANNELS.appLimitsGetStatuses, async () => {
    return appLimitChecker?.getStatuses() ?? [];
  });

  // --- Focus Schedules ---
  ipcMain.handle(IPC_CHANNELS.focusSchedulesGetAll, async () => {
    return database.getFocusSchedules();
  });

  ipcMain.handle(IPC_CHANNELS.focusSchedulesCreate, async (_event, schedule: { label: string; daysOfWeek: string; startTime: string; endTime: string; enabled: boolean }) => {
    await database.createFocusSchedule(schedule);
    return database.getFocusSchedules();
  });

  ipcMain.handle(IPC_CHANNELS.focusSchedulesUpdate, async (_event, schedule: FocusSchedule) => {
    await database.updateFocusSchedule(schedule);
    return database.getFocusSchedules();
  });

  ipcMain.handle(IPC_CHANNELS.focusSchedulesRemove, async (_event, id: number) => {
    await database.removeFocusSchedule(id);
    return database.getFocusSchedules();
  });

  ipcMain.on(IPC_CHANNELS.windowMinimize, (event) => {
    BrowserWindow.fromWebContents(event.sender)?.minimize();
  });

  ipcMain.on(IPC_CHANNELS.windowMaximize, (event) => {
    const win = BrowserWindow.fromWebContents(event.sender);
    if (win?.isMaximized()) {
      win.unmaximize();
    } else {
      win?.maximize();
    }
  });

  ipcMain.on(IPC_CHANNELS.windowClose, (event) => {
    BrowserWindow.fromWebContents(event.sender)?.close();
  });
};

