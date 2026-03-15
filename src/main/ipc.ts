import path from 'node:path';
import { existsSync } from 'node:fs';
import { app, BrowserWindow, ipcMain } from 'electron';
import type { AIToolProcess, AppSettings, DateRange, FocusSchedule, TrackerStatus } from '../shared/types';
import { ArkWatchDatabase } from './db/database';
import { ActivityTrackerService } from './tracker/activity-tracker-service';
import { IPC_CHANNELS } from '../shared/ipc';
import { BackgroundProcessTracker, scanBackgroundProcesses } from './tracker/process-scanner';
import { FocusService } from './focus/focus-service';
import { AppLimitChecker } from './focus/app-limit-checker';
import { checkForUpdatesNow } from './updater';

const iconByRequestKey = new Map<string, string | null>();
const iconByCandidatePath = new Map<string, string | null>();

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

const knownAliasExecutables = (normalizedToken: string, systemRoot: string): string[] => {
  const screenSketch = path.join(systemRoot, 'SystemApps', 'Microsoft.ScreenSketch_8wekyb3d8bbwe', 'ScreenSketch.exe');

  if (normalizedToken === 'task manager' || normalizedToken === 'taskmgr' || normalizedToken === 'taskmgr.exe') {
    return ['Taskmgr.exe'];
  }

  if (
    normalizedToken === 'snipping tool' ||
    normalizedToken === 'snippingtool' ||
    normalizedToken === 'snippingtool.exe' ||
    normalizedToken === 'screen sketch' ||
    normalizedToken === 'screensketch' ||
    normalizedToken === 'screensketch.exe'
  ) {
    return ['SnippingTool.exe', 'ScreenSketch.exe', screenSketch];
  }

  return [];
};

const tokenToCandidatePaths = (token: string, systemRoot: string): string[] => {
  const trimmed = token.trim();
  if (!trimmed) {
    return [];
  }

  if (path.isAbsolute(trimmed)) {
    return [trimmed];
  }

  const hasSeparators = trimmed.includes('\\') || trimmed.includes('/');
  const base = path.basename(trimmed);
  const hasExtension = /\.[a-z0-9]+$/i.test(base);

  const localTokens = new Set<string>();
  localTokens.add(trimmed);

  if (!hasExtension && !hasSeparators) {
    localTokens.add(`${trimmed}.exe`);
  }

  if (base && base !== trimmed) {
    localTokens.add(base);
    if (!/\.[a-z0-9]+$/i.test(base)) {
      localTokens.add(`${base}.exe`);
    }
  }

  const candidates = new Set<string>();

  for (const localToken of localTokens) {
    if (path.isAbsolute(localToken)) {
      continue;
    }

    if (localToken.includes('\\') || localToken.includes('/')) {
      continue;
    }

    candidates.add(path.join(systemRoot, 'System32', localToken));
    candidates.add(path.join(systemRoot, 'SysWOW64', localToken));
    candidates.add(path.join(systemRoot, localToken));
  }

  return Array.from(candidates);
};

const buildIconCandidates = (appName: string, exePath: string | null): string[] => {
  const systemRoot = process.env.SystemRoot ?? 'C:\\Windows';

  const tokens = new Set<string>();
  const addToken = (value: string | null | undefined): void => {
    if (!value) {
      return;
    }

    const trimmed = value.trim();
    if (!trimmed) {
      return;
    }

    tokens.add(trimmed);
    tokens.add(path.basename(trimmed));
  };

  addToken(exePath);
  addToken(appName);

  const compactName = normalize(appName).replace(/\s+/g, '');
  if (compactName) {
    tokens.add(compactName);
  }

  const candidates: string[] = [];
  const seen = new Set<string>();
  const addCandidate = (candidate: string): void => {
    if (!candidate || seen.has(candidate)) {
      return;
    }

    seen.add(candidate);
    candidates.push(candidate);
  };

  for (const token of tokens) {
    for (const candidate of tokenToCandidatePaths(token, systemRoot)) {
      addCandidate(candidate);
    }

    for (const alias of knownAliasExecutables(normalize(token), systemRoot)) {
      for (const candidate of tokenToCandidatePaths(alias, systemRoot)) {
        addCandidate(candidate);
      }
    }
  }

  return candidates;
};

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
        if (iconByCandidatePath.has(candidate)) {
          const cached = iconByCandidatePath.get(candidate) ?? null;
          if (cached) {
            iconByRequestKey.set(requestKey, cached);
            return cached;
          }
          continue;
        }

        const looksLikePath = path.isAbsolute(candidate) || candidate.includes('\\') || candidate.includes('/');
        if (looksLikePath && !existsSync(candidate)) {
          iconByCandidatePath.set(candidate, null);
          continue;
        }

        try {
          let resolvedIcon: string | null = null;

          for (const size of iconSizes) {
            const icon = await app.getFileIcon(candidate, { size });
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

          iconByCandidatePath.set(candidate, resolvedIcon);

          if (resolvedIcon) {
            iconByRequestKey.set(requestKey, resolvedIcon);
            return resolvedIcon;
          }
        } catch {
          iconByCandidatePath.set(candidate, null);
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
