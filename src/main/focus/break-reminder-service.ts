import { BrowserWindow, Notification } from 'electron';
import { ArkWatchDatabase } from '../db/database';
import { ActivityTrackerService } from '../tracker/activity-tracker-service';
import { IPC_CHANNELS } from '../../shared/ipc';

export class BreakReminderService {
  private timer: ReturnType<typeof setInterval> | null = null;
  private continuousActiveSeconds = 0;
  private lastNotifiedAt = 0;

  constructor(
    private readonly db: ArkWatchDatabase,
    private readonly tracker: ActivityTrackerService,
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

  private async check(): Promise<void> {
    try {
      const settings = await this.db.getSettings();
      if (!settings.breakReminderEnabled) {
        this.continuousActiveSeconds = 0;
        return;
      }

      const status = this.tracker.getStatus();
      if (status.idle || status.paused) {
        this.continuousActiveSeconds = 0;
        return;
      }

      this.continuousActiveSeconds += 60;

      const thresholdSeconds = settings.breakReminderIntervalMinutes * 60;
      if (this.continuousActiveSeconds >= thresholdSeconds) {
        const now = Date.now();
        if (now - this.lastNotifiedAt > thresholdSeconds * 1000 * 0.9) {
          this.lastNotifiedAt = now;
          this.continuousActiveSeconds = 0;

          new Notification({
            title: 'Time for a Break',
            body: `You've been active for ${settings.breakReminderIntervalMinutes} minutes. Take a short break!`
          }).show();

          const win = this.getWindow();
          if (win && !win.isDestroyed()) {
            win.webContents.send(IPC_CHANNELS.breakReminderNotify);
          }
        }
      }
    } catch {
      // ignore errors
    }
  }
}
