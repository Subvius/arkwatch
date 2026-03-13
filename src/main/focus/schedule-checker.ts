import { ArkWatchDatabase } from '../db/database';
import { FocusService } from './focus-service';

const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export class ScheduleChecker {
  private timer: ReturnType<typeof setInterval> | null = null;

  constructor(
    private readonly db: ArkWatchDatabase,
    private readonly focusService: FocusService
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
      if (this.focusService.getState().active) return;

      const schedules = await this.db.getFocusSchedules();
      const now = new Date();
      const currentDay = DAY_NAMES[now.getDay()];
      const currentMinutes = now.getHours() * 60 + now.getMinutes();

      for (const schedule of schedules) {
        if (!schedule.enabled) continue;

        const days = schedule.daysOfWeek.split(',').map((d) => d.trim());
        if (!days.includes(currentDay)) continue;

        const [startH, startM] = schedule.startTime.split(':').map(Number);
        const [endH, endM] = schedule.endTime.split(':').map(Number);
        const startMinutes = startH * 60 + startM;
        const endMinutes = endH * 60 + endM;

        const isInSchedule = endMinutes > startMinutes
          ? currentMinutes >= startMinutes && currentMinutes <= endMinutes
          : currentMinutes >= startMinutes || currentMinutes <= endMinutes;

        if (isInSchedule) {
          let deltaMinutes = (endMinutes - startMinutes + 1440) % 1440;
          if (deltaMinutes === 0) {
            deltaMinutes = 24 * 60;
          }

          const durationSec = deltaMinutes * 60;
          await this.focusService.start(durationSec, schedule.label);
          return;
        }
      }
    } catch {
      // ignore errors
    }
  }
}
