import path from 'node:path';
import { promises as fs, existsSync } from 'node:fs';
import { app, BrowserWindow, Menu, Notification, Tray, nativeImage, nativeTheme } from 'electron';
import { IPC_CHANNELS } from '../shared/ipc';
import { ArkWatchDatabase } from './db/database';
import { registerIpcHandlers } from './ipc';
import { ElectronActivitySource } from './tracker/electron-activity-source';
import { ActivityTrackerService } from './tracker/activity-tracker-service';
import { BackgroundProcessTracker } from './tracker/process-scanner';
import { setupAutoUpdater } from './updater';
import type { AppSettings } from '../shared/types';
import { FocusService } from './focus/focus-service';
import { BreakReminderService } from './focus/break-reminder-service';
import { AppLimitChecker } from './focus/app-limit-checker';
import { ScheduleChecker } from './focus/schedule-checker';

let mainWindow: BrowserWindow | null = null;
let tray: Tray | null = null;
let database: ArkWatchDatabase | null = null;
let tracker: ActivityTrackerService | null = null;
let bgTracker: BackgroundProcessTracker | null = null;
let focusService: FocusService | null = null;
let breakReminderService: BreakReminderService | null = null;
let appLimitChecker: AppLimitChecker | null = null;
let scheduleChecker: ScheduleChecker | null = null;
let isQuiting = false;
let isHiddenToTray = false;
let shutdownPromise: Promise<void> | null = null;
let refreshTrayMenu: (() => void) | null = null;
let disposeAutoUpdater: (() => void) | null = null;
let minimizeToTray = true;
let dailyGoalNotificationSentDate: string | null = null;

const getAppIconPath = (): string | null => {
  const iconCandidates = app.isPackaged
    ? [path.join(process.resourcesPath, 'assets', 'logo.ico')]
    : [path.join(app.getAppPath(), 'build', 'logo.ico')];

  for (const iconPath of iconCandidates) {
    if (existsSync(iconPath)) {
      return iconPath;
    }
  }

  return null;
};

const getWindowBackgroundColor = (): string => (
  nativeTheme.shouldUseDarkColors ? '#131520' : '#f3f5fb'
);

const createWindow = (): BrowserWindow => {
  const appIconPath = getAppIconPath();

  const window = new BrowserWindow({
    width: 1280,
    height: 860,
    minWidth: 960,
    minHeight: 640,
    show: false,
    frame: false,
    backgroundColor: getWindowBackgroundColor(),
    title: 'ArkWatch',
    ...(appIconPath ? { icon: appIconPath } : {}),
    webPreferences: {
      preload: path.join(__dirname, '../preload/index.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true
    }
  });

  window.on('ready-to-show', () => {
    window.show();
  });

  window.on('close', (event) => {
    if (!isQuiting) {
      if (minimizeToTray) {
        event.preventDefault();
        window.hide();
        isHiddenToTray = true;
      } else {
        isQuiting = true;
        app.quit();
      }
    }
  });

  if (process.env.ELECTRON_RENDERER_URL) {
    void window.loadURL(process.env.ELECTRON_RENDERER_URL);
  } else {
    void window.loadFile(path.join(__dirname, '../renderer/index.html'));
  }

  return window;
};

const applyAppSettings = async (settings: AppSettings): Promise<void> => {
  app.setLoginItemSettings({
    openAtLogin: settings.launchAtLogin,
    path: process.execPath
  });
  nativeTheme.themeSource = settings.theme;
  minimizeToTray = settings.minimizeToTray;
};

const syncAutoUpdater = (settings: AppSettings): void => {
  if (!settings.autoCheckUpdates) {
    if (disposeAutoUpdater) {
      disposeAutoUpdater();
      disposeAutoUpdater = null;
      console.info('[updater] disabled by user setting');
    }
    return;
  }

  if (disposeAutoUpdater) {
    return;
  }

  disposeAutoUpdater = setupAutoUpdater(() => mainWindow);
};

const createTray = (): { tray: Tray; refresh: () => void } => {
  const appIconPath = getAppIconPath();
  const trayIconFromAppPath = appIconPath ? nativeImage.createFromPath(appIconPath) : nativeImage.createEmpty();
  const trayIconFromExecutable = nativeImage.createFromPath(process.execPath);
  const trayIcon = !trayIconFromAppPath.isEmpty()
    ? trayIconFromAppPath
    : !trayIconFromExecutable.isEmpty()
      ? trayIconFromExecutable
      : nativeImage.createFromDataURL(
          'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIxNiIgaGVpZ2h0PSIxNiIgdmlld0JveD0iMCAwIDE2IDE2Ij48cmVjdCB4PSIxIiB5PSIxIiB3aWR0aD0iMTQiIGhlaWdodD0iMTQiIGZpbGw9IiMwQzBBMDkiIHN0cm9rZT0iI0Y0RjFERSIgc3Ryb2tlLXdpZHRoPSIyIi8+PHBhdGggZD0iTTQgMTBINnYySDR6bTQgLTNoMnY1SDh6bTQgLTRoMnY5aC0yeiIgZmlsbD0iI0Y0RjFERSIvPjwvc3ZnPg=='
        );

  const newTray = new Tray(trayIcon);
  newTray.setToolTip('ArkWatch');

  const buildMenu = (): Menu => {
    const status = tracker?.getStatus();
    const paused = status?.paused ?? false;

    return Menu.buildFromTemplate([
      {
        label: 'Open Dashboard',
        click: () => {
          if (!mainWindow) {
            return;
          }

          mainWindow.show();
          mainWindow.focus();
          if (isHiddenToTray) {
            mainWindow.webContents.send(IPC_CHANNELS.windowRestoredFromTray);
            isHiddenToTray = false;
          }
        }
      },
      {
        label: paused ? 'Resume Tracking' : 'Pause Tracking',
        click: () => {
          if (!tracker) {
            return;
          }

          const action = paused ? tracker.resume() : tracker.pause();
          void action.then(() => {
            refresh();
          });
        }
      },
      { type: 'separator' },
      {
        label: 'Quit',
        click: () => {
          isQuiting = true;
          app.quit();
        }
      }
    ]);
  };

  const refresh = (): void => {
    newTray.setContextMenu(buildMenu());
  };

  refresh();

  newTray.on('double-click', () => {
    if (!mainWindow) {
      return;
    }

    mainWindow.show();
    mainWindow.focus();
    if (isHiddenToTray) {
      mainWindow.webContents.send(IPC_CHANNELS.windowRestoredFromTray);
      isHiddenToTray = false;
    }
  });

  return { tray: newTray, refresh };
};

const shutdown = async (): Promise<void> => {
  if (disposeAutoUpdater) {
    disposeAutoUpdater();
    disposeAutoUpdater = null;
  }
  if (scheduleChecker) {
    scheduleChecker.stop();
    scheduleChecker = null;
  }
  if (appLimitChecker) {
    appLimitChecker.stop();
    appLimitChecker = null;
  }
  if (breakReminderService) {
    breakReminderService.stop();
    breakReminderService = null;
  }
  if (focusService) {
    await focusService.dispose();
    focusService = null;
  }
  if (bgTracker) {
    await bgTracker.stop();
    bgTracker = null;
  }

  if (tracker) {
    await tracker.stop();
    tracker = null;
  }

  if (database) {
    await database.close();
    database = null;
  }

  if (tray) {
    tray.destroy();
    tray = null;
  }
};

const ensureShutdown = (): Promise<void> => {
  if (!shutdownPromise) {
    shutdownPromise = shutdown().catch((error) => {
      console.error('ArkWatch shutdown failed', error);
    });
  }

  return shutdownPromise;
};

const bootstrap = async (): Promise<void> => {
  const userDataPath = path.join(app.getPath('appData'), 'ArkWatch');
  await fs.mkdir(userDataPath, { recursive: true });

  database = new ArkWatchDatabase(path.join(userDataPath, 'arkwatch.db'));
  await database.init();

  const settings = await database.getSettings();
  await applyAppSettings(settings);

  bgTracker = new BackgroundProcessTracker(async (session) => {
    await database!.insertSession(session);
  }, 10_000);
  bgTracker.start();

  tracker = new ActivityTrackerService(
    new ElectronActivitySource(),
    database,
    settings.idleThresholdSeconds,
    1000,
    () => bgTracker?.getRunningToolApp('claude') ?? null
  );
  await tracker.start();

  const getMainWindow = (): BrowserWindow | null => mainWindow;

  focusService = new FocusService(database, getMainWindow);
  breakReminderService = new BreakReminderService(database, tracker, focusService, getMainWindow);
  breakReminderService.start();
  appLimitChecker = new AppLimitChecker(database, getMainWindow);
  appLimitChecker.start();
  scheduleChecker = new ScheduleChecker(database, focusService);
  scheduleChecker.start();

  registerIpcHandlers(database, tracker, async (nextSettings) => {
    await applyAppSettings(nextSettings);
    syncAutoUpdater(nextSettings);
  }, () => {
    refreshTrayMenu?.();
  }, focusService, appLimitChecker);

  mainWindow = createWindow();

  const trayBundle = createTray();
  tray = trayBundle.tray;
  refreshTrayMenu = trayBundle.refresh;
  syncAutoUpdater(settings);

  // Daily goal notification check (every 60s)
  const goalCheckTimer = setInterval(async () => {
    if (!database) return;

    try {
      const currentSettings = await database.getSettings();
      if (!currentSettings.dailyGoalNotification) return;

      const now = new Date();
      const y = now.getFullYear();
      const m = String(now.getMonth() + 1).padStart(2, '0');
      const d = String(now.getDate()).padStart(2, '0');
      const today = `${y}-${m}-${d}`;
      if (dailyGoalNotificationSentDate === today) return;

      const from = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
      const to = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999).toISOString();
      const summary = await database.getSummary({ from, to });

      if (summary.totalActiveSeconds >= currentSettings.dailyGoalHours * 3600) {
        dailyGoalNotificationSentDate = today;
        new Notification({
          title: 'Daily Goal Reached!',
          body: `You've hit your ${currentSettings.dailyGoalHours}h daily screen time goal.`
        }).show();
      }
    } catch {
      // ignore notification check errors
    }
  }, 60_000);
  goalCheckTimer.unref();
};

if (!app.requestSingleInstanceLock()) {
  app.quit();
} else {
  app.setName('ArkWatch');
  if (process.platform === 'win32') {
    app.setAppUserModelId('com.arkwatch.desktop');
  }

  app.on('second-instance', () => {
    if (mainWindow) {
      mainWindow.show();
      mainWindow.focus();
      if (isHiddenToTray) {
        mainWindow.webContents.send(IPC_CHANNELS.windowRestoredFromTray);
        isHiddenToTray = false;
      }
    }
  });

  app.whenReady().then(() => {
    void bootstrap().catch((error) => {
      console.error('ArkWatch bootstrap failed', error);
      app.exit(1);
    });
  });

  app.on('before-quit', (event) => {
    isQuiting = true;

    if (shutdownPromise) {
      return;
    }

    event.preventDefault();

    void ensureShutdown().finally(() => {
      app.quit();
    });
  });

  app.on('window-all-closed', () => {
    // Keep app alive in tray on Windows.
  });
}



