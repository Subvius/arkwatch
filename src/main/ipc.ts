import { BrowserWindow, ipcMain } from 'electron';
import type { AppSettings, DateRange } from '../shared/types';
import { ArkWatchDatabase } from './db/database';
import { ActivityTrackerService } from './tracker/activity-tracker-service';
import { IPC_CHANNELS } from '../shared/ipc';
import { scanBackgroundProcesses } from './tracker/process-scanner';

export const registerIpcHandlers = (
  database: ArkWatchDatabase,
  tracker: ActivityTrackerService,
  onSettingsUpdated: (settings: AppSettings) => Promise<void>,
  onTrackerStatusChanged: () => void
): void => {
  ipcMain.handle(IPC_CHANNELS.trackerGetStatus, () => {
    return tracker.getStatus();
  });

  ipcMain.handle(IPC_CHANNELS.trackerPause, async () => {
    const status = await tracker.pause();
    onTrackerStatusChanged();
    return status;
  });

  ipcMain.handle(IPC_CHANNELS.trackerResume, async () => {
    const status = await tracker.resume();
    onTrackerStatusChanged();
    return status;
  });

  ipcMain.handle(IPC_CHANNELS.trackerToggle, async () => {
    const status = await tracker.toggle();
    onTrackerStatusChanged();
    return status;
  });

  ipcMain.handle(IPC_CHANNELS.statsGetSummary, (_event, range: DateRange) => {
    return database.getSummary(range);
  });

  ipcMain.handle(IPC_CHANNELS.statsGetTopApps, (_event, params: DateRange & { limit: number }) => {
    return database.getTopApps(params, params.limit);
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

  ipcMain.handle(IPC_CHANNELS.processesGetAITools, async () => {
    const processes = await scanBackgroundProcesses();
    return Array.from(processes.entries()).map(([id, info]) => ({
      id,
      name: info.name,
      running: info.running
    }));
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
