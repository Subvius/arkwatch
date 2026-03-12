import { app, dialog, type BrowserWindow, type MessageBoxOptions } from 'electron';
import { autoUpdater } from 'electron-updater';

const UPDATE_CHECK_INTERVAL_MS = 6 * 60 * 60 * 1000;
const INITIAL_CHECK_DELAY_MS = 15 * 1000;

type UpdaterWindowGetter = () => BrowserWindow | null;

export const setupAutoUpdater = (getMainWindow: UpdaterWindowGetter): (() => void) => {
  if (!app.isPackaged) {
    return () => {};
  }

  autoUpdater.autoDownload = true;
  autoUpdater.autoInstallOnAppQuit = true;

  autoUpdater.on('checking-for-update', () => {
    console.info('[updater] checking for update');
  });

  autoUpdater.on('update-available', (info) => {
    console.info('[updater] update available', info.version);
  });

  autoUpdater.on('update-not-available', () => {
    console.info('[updater] no updates available');
  });

  autoUpdater.on('download-progress', (progress) => {
    const roundedPercent = Math.round(progress.percent);
    console.info('[updater] download progress', `${roundedPercent}%`);
  });

  autoUpdater.on('error', (error) => {
    console.error('[updater] failed', error);
  });

  autoUpdater.on('update-downloaded', async (info) => {
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
    const result = mainWindow
      ? await dialog.showMessageBox(mainWindow, options)
      : await dialog.showMessageBox(options);

    if (result.response === 0) {
      setImmediate(() => {
        autoUpdater.quitAndInstall();
      });
    }
  });

  const checkForUpdates = async (): Promise<void> => {
    try {
      await autoUpdater.checkForUpdates();
    } catch (error) {
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
    clearTimeout(initialTimer);
    clearInterval(recurringTimer);
  };
};
