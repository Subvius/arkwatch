import { BrowserWindow, Notification } from 'electron';
import { ArkWatchDatabase } from '../db/database';
import { IPC_CHANNELS } from '../../shared/ipc';
import type { AppLimitStatus } from '../../shared/types';

export class AppLimitChecker {
  private timer: ReturnType<typeof setInterval> | null = null;
  private notifiedToday = new Set<string>();
  private lastResetDate = '';

  constructor(
    private readonly db: ArkWatchDatabase,
    private readonly getWindow: () => BrowserWindow | null
  ) {}

  start(): void {
    this.timer = setInterval(() => void this.check(), 60_000);
    this.timer.unref();
  }

  stop(): void {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }

  async getStatuses(): Promise<AppLimitStatus[]> {
    const limits = await this.db.getAppLimits();
    const statuses: AppLimitStatus[] = [];

    for (const limit of limits) {
      if (!limit.enabled) continue;
      const usedSeconds = await this.db.getAppUsageToday(limit.appName);
      statuses.push({
        appName: limit.appName,
        dailyLimitSeconds: limit.dailyLimitSeconds,
        usedSeconds,
        exceeded: usedSeconds >= limit.dailyLimitSeconds
      });
    }

    return statuses;
  }

  private async check(): Promise<void> {
    try {
      const now = new Date();
      const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;

      if (today !== this.lastResetDate) {
        this.notifiedToday.clear();
        this.lastResetDate = today;
      }

      const limits = await this.db.getAppLimits();

      for (const limit of limits) {
        if (!limit.enabled) continue;
        if (this.notifiedToday.has(limit.appName)) continue;

        const usedSeconds = await this.db.getAppUsageToday(limit.appName);
        if (usedSeconds >= limit.dailyLimitSeconds) {
          this.notifiedToday.add(limit.appName);

          const limitMinutes = Math.round(limit.dailyLimitSeconds / 60);
          new Notification({
            title: 'App Limit Reached',
            body: `You've exceeded your ${limitMinutes}min limit for ${limit.appName}.`
          }).show();

          const status: AppLimitStatus = {
            appName: limit.appName,
            dailyLimitSeconds: limit.dailyLimitSeconds,
            usedSeconds,
            exceeded: true
          };

          const win = this.getWindow();
          if (win && !win.isDestroyed()) {
            win.webContents.send(IPC_CHANNELS.appLimitsExceeded, status);
          }
        }
      }
    } catch {
      // ignore errors
    }
  }
}
