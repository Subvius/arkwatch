import { app, dialog, type BrowserWindow, type MessageBoxOptions } from 'electron';
import { autoUpdater } from 'electron-updater';
import { IPC_CHANNELS } from '../shared/ipc';
import type { ProgressInfo } from '../shared/types';

const UPDATE_CHECK_INTERVAL_MS = 6 * 60 * 60 * 1000;
const INITIAL_CHECK_DELAY_MS = 15 * 1000;

type UpdaterWindowGetter = () => BrowserWindow | null;

const sendDownloadProgress = (getMainWindow: UpdaterWindowGetter, progress: ProgressInfo): void => {
  const mainWindow = getMainWindow();
  if (!mainWindow || mainWindow.isDestroyed()) {
    return;
  }

  mainWindow.webContents.send(IPC_CHANNELS.updaterDownloadProgress, progress);
};

export const setupAutoUpdater = (getMainWindow: UpdaterWindowGetter): (() => void) => {
  if (!app.isPackaged) {
    return () => {};
  }

  let isDisposed = false;

  autoUpdater.autoDownload = true;
  autoUpdater.autoInstallOnAppQuit = true;

  const onCheckingForUpdate = (): void => {
    if (isDisposed) {
      return;
    }

    console.info('[updater] checking for update');
  };

  const onUpdateAvailable = (info: { version: string }): void => {
    if (isDisposed) {
      return;
    }

    console.info('[updater] update available', info.version);
  };

  const onUpdateNotAvailable = (): void => {
    if (isDisposed) {
      return;
    }

    console.info('[updater] no updates available');
  };

  const onDownloadProgress = (progress: ProgressInfo): void => {
    if (isDisposed) {
      return;
    }

    const roundedPercent = Math.round(progress.percent);
    console.info('[updater] download progress', `${roundedPercent}%`);

    sendDownloadProgress(getMainWindow, progress);
  };

  const onError = (error: Error): void => {
    if (isDisposed) {
      return;
    }

    console.error('[updater] failed', error);
  };

  const onUpdateDownloaded = async (info: { version: string }): Promise<void> => {
    if (isDisposed) {
      return;
    }

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

    if (isDisposed) {
      return;
    }

    if (result.response === 0) {
      setImmediate(() => {
        if (isDisposed) {
          return;
        }

        autoUpdater.quitAndInstall();
      });
    }
  };

  autoUpdater.on('checking-for-update', onCheckingForUpdate);
  autoUpdater.on('update-available', onUpdateAvailable);
  autoUpdater.on('update-not-available', onUpdateNotAvailable);
  autoUpdater.on('download-progress', onDownloadProgress);
  autoUpdater.on('error', onError);
  autoUpdater.on('update-downloaded', onUpdateDownloaded);

  const checkForUpdates = async (): Promise<void> => {
    if (isDisposed) {
      return;
    }

    try {
      await autoUpdater.checkForUpdates();
    } catch (error) {
      if (isDisposed) {
        return;
      }

      console.error('[updater] check failed', error);
    }
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

    clearTimeout(initialTimer);
    clearInterval(recurringTimer);

    autoUpdater.off('checking-for-update', onCheckingForUpdate);
    autoUpdater.off('update-available', onUpdateAvailable);
    autoUpdater.off('update-not-available', onUpdateNotAvailable);
    autoUpdater.off('download-progress', onDownloadProgress);
    autoUpdater.off('error', onError);
    autoUpdater.off('update-downloaded', onUpdateDownloaded);
  };
};

