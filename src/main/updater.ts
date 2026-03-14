import { app, dialog, type BrowserWindow, type MessageBoxOptions } from 'electron';
import electronUpdater from 'electron-updater';
const { autoUpdater } = electronUpdater;
import { IPC_CHANNELS } from '../shared/ipc';
import type { ManualUpdateCheckResult, ProgressInfo } from '../shared/types';

const UPDATE_CHECK_INTERVAL_MS = 6 * 60 * 60 * 1000;
const INITIAL_CHECK_DELAY_MS = 15 * 1000;

type UpdaterWindowGetter = () => BrowserWindow | null;

let activeWindowGetter: UpdaterWindowGetter = () => null;
let listenersRegistered = false;
let updaterDisposed = false;

const getUpdaterSkipReason = (): string | null => {
  if (process.env.ARKWATCH_DISABLE_UPDATES === '1') {
    return 'ARKWATCH_DISABLE_UPDATES=1';
  }

  if (!app.isPackaged) {
    return 'app is not packaged';
  }

  if (process.env.NODE_ENV === 'development' || typeof process.env.ELECTRON_RENDERER_URL === 'string') {
    return 'development runtime detected';
  }

  return null;
};

const getMainWindow = (): BrowserWindow | null => activeWindowGetter();

const configureAutoUpdater = (): void => {
  autoUpdater.autoDownload = true;
  autoUpdater.autoInstallOnAppQuit = true;
};

const sendDownloadProgress = (progress: ProgressInfo): void => {
  const mainWindow = getMainWindow();
  if (!mainWindow || mainWindow.isDestroyed()) {
    return;
  }

  mainWindow.webContents.send(IPC_CHANNELS.updaterDownloadProgress, progress);
};

const onCheckingForUpdate = (): void => {
  if (updaterDisposed) {
    return;
  }

  console.info('[updater] checking for update');
};

const onUpdateAvailable = (info: { version: string }): void => {
  if (updaterDisposed) {
    return;
  }

  console.info('[updater] update available', info.version);
};

const onUpdateNotAvailable = (): void => {
  if (updaterDisposed) {
    return;
  }

  console.info('[updater] no updates available');
};

const onDownloadProgress = (progress: ProgressInfo): void => {
  if (updaterDisposed) {
    return;
  }

  const roundedPercent = Math.round(progress.percent);
  console.info('[updater] download progress', `${roundedPercent}%`);
  sendDownloadProgress(progress);
};

const onError = (error: Error): void => {
  if (updaterDisposed) {
    return;
  }

  console.error('[updater] failed', error);
};

const onUpdateDownloaded = async (info: { version: string }): Promise<void> => {
  if (updaterDisposed) {
    return;
  }

  try {
    const options: MessageBoxOptions = {
      type: 'info',
      title: 'Update Ready',
      message: `ArkWatch ${info.version} has been downloaded.`,
      detail: 'Restart now to apply the update.',
      buttons: ['Restart now', 'Later'],
      defaultId: 0,
      cancelId: 1,
      noLink: true
    };

    const mainWindow = getMainWindow();
    const result = mainWindow && !mainWindow.isDestroyed()
      ? await dialog.showMessageBox(mainWindow, options)
      : await dialog.showMessageBox(options);

    if (updaterDisposed) {
      return;
    }

    if (result.response === 0) {
      setImmediate(() => {
        try {
          autoUpdater.quitAndInstall();
        } catch (error) {
          console.error('[updater] quit and install failed', error);
        }
      });
    }
  } catch (error) {
    console.error('[updater] update-downloaded handler failed', error);
  }
};

const removeUpdaterListeners = (): void => {
  if (!listenersRegistered) {
    return;
  }

  autoUpdater.off('checking-for-update', onCheckingForUpdate);
  autoUpdater.off('update-available', onUpdateAvailable);
  autoUpdater.off('update-not-available', onUpdateNotAvailable);
  autoUpdater.off('download-progress', onDownloadProgress);
  autoUpdater.off('error', onError);
  autoUpdater.off('update-downloaded', onUpdateDownloaded);
  listenersRegistered = false;
};

const ensureUpdaterListeners = (getMainWindowForUpdates: UpdaterWindowGetter): void => {
  activeWindowGetter = getMainWindowForUpdates;
  updaterDisposed = false;
  configureAutoUpdater();

  if (listenersRegistered) {
    return;
  }

  autoUpdater.on('checking-for-update', onCheckingForUpdate);
  autoUpdater.on('update-available', onUpdateAvailable);
  autoUpdater.on('update-not-available', onUpdateNotAvailable);
  autoUpdater.on('download-progress', onDownloadProgress);
  autoUpdater.on('error', onError);
  autoUpdater.on('update-downloaded', onUpdateDownloaded);
  listenersRegistered = true;
};

const runUpdateCheck = async (): Promise<ManualUpdateCheckResult> => {
  try {
    const result = await autoUpdater.checkForUpdates();
    if (!result) {
      return {
        status: 'unavailable',
        reason: 'Updater returned no result.'
      };
    }

    return result.isUpdateAvailable
      ? { status: 'available', version: result.updateInfo.version }
      : { status: 'not-available', version: result.updateInfo.version };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown update error';
    console.error('[updater] check failed', error);
    return {
      status: 'error',
      message
    };
  }
};

export const checkForUpdatesNow = async (getMainWindowForUpdates: UpdaterWindowGetter): Promise<ManualUpdateCheckResult> => {
  const skipReason = getUpdaterSkipReason();
  if (skipReason) {
    return {
      status: 'unavailable',
      reason: skipReason
    };
  }

  ensureUpdaterListeners(getMainWindowForUpdates);
  return runUpdateCheck();
};

export const setupAutoUpdater = (getMainWindowForUpdates: UpdaterWindowGetter): (() => void) => {
  const skipReason = getUpdaterSkipReason();
  if (skipReason) {
    console.info('[updater] disabled', skipReason);
    return () => {};
  }

  ensureUpdaterListeners(getMainWindowForUpdates);

  let isDisposed = false;

  const checkForUpdates = async (): Promise<void> => {
    if (isDisposed) {
      return;
    }

    await runUpdateCheck();
  };

  const initialTimer = setTimeout(() => {
    void checkForUpdates();
  }, INITIAL_CHECK_DELAY_MS);

  const recurringTimer = setInterval(() => {
    void checkForUpdates();
  }, UPDATE_CHECK_INTERVAL_MS);

  initialTimer.unref();
  recurringTimer.unref();

  return () => {
    isDisposed = true;
    updaterDisposed = true;
    clearTimeout(initialTimer);
    clearInterval(recurringTimer);
    removeUpdaterListeners();
  };
};
