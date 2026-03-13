import { BrowserWindow, Notification } from 'electron';
import { ArkWatchDatabase } from '../db/database';
import { IPC_CHANNELS } from '../../shared/ipc';
import type { FocusSessionState } from '../../shared/types';

const IDLE_STATE: FocusSessionState = {
  active: false,
  remainingSeconds: 0,
  plannedDurationSec: 0,
  elapsedSeconds: 0,
  label: null
};

export class FocusService {
  private timer: ReturnType<typeof setInterval> | null = null;
  private state: FocusSessionState = { ...IDLE_STATE };
  private sessionDbId: number | null = null;
  private getWindow: () => BrowserWindow | null;

  constructor(
    private readonly db: ArkWatchDatabase,
    getWindow: () => BrowserWindow | null
  ) {
    this.getWindow = getWindow;
  }

  getState(): FocusSessionState {
    return { ...this.state };
  }

  async start(durationSec: number, label?: string): Promise<FocusSessionState> {
    if (this.state.active) {
      await this.stop();
    }

    const now = new Date().toISOString();
    this.sessionDbId = await this.db.insertFocusSession({
      startedAt: now,
      plannedDurationSec: durationSec,
      label: label ?? null
    });

    this.state = {
      active: true,
      remainingSeconds: durationSec,
      plannedDurationSec: durationSec,
      elapsedSeconds: 0,
      label: label ?? null
    };

    this.timer = setInterval(() => this.tick(), 1000);

    this.pushState();
    return this.getState();
  }

  async stop(): Promise<FocusSessionState> {
    if (!this.state.active) {
      return this.getState();
    }

    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }

    const completed = this.state.remainingSeconds <= 0;

    if (this.sessionDbId !== null) {
      await this.db.updateFocusSession(this.sessionDbId, {
        endedAt: new Date().toISOString(),
        actualDurationSec: this.state.elapsedSeconds,
        completed
      });
      this.sessionDbId = null;
    }

    this.state = { ...IDLE_STATE };
    this.pushState();
    return this.getState();
  }

  async getTodayCount(): Promise<number> {
    return this.db.getTodayFocusSessionCount();
  }

  dispose(): void {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }

  private tick(): void {
    if (!this.state.active) return;

    this.state.elapsedSeconds += 1;
    this.state.remainingSeconds = Math.max(0, this.state.plannedDurationSec - this.state.elapsedSeconds);

    this.pushState();

    if (this.state.remainingSeconds <= 0) {
      new Notification({
        title: 'Focus Session Complete!',
        body: this.state.label
          ? `Your "${this.state.label}" session is done. Great work!`
          : 'Your focus session is done. Great work!'
      }).show();

      void this.stop();
    }
  }

  private pushState(): void {
    const win = this.getWindow();
    if (win && !win.isDestroyed()) {
      win.webContents.send(IPC_CHANNELS.focusStateChanged, this.getState());
    }
  }
}
