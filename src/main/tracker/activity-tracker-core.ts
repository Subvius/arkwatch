import type { SessionInput, TrackerStatus } from '../../shared/types';
import type { ActiveApp } from './types';

type PersistSession = (session: SessionInput) => Promise<void>;

type Segment = {
  app: ActiveApp;
  startedAt: Date;
  isIdle: boolean;
};

const UNKNOWN_APP: ActiveApp = {
  appName: 'Unknown',
  exePath: null
};

export class ActivityTrackerCore {
  private segment: Segment | null = null;
  private paused = false;
  private running = false;
  private idle = false;
  private idleSeconds = 0;

  constructor(
    private idleThresholdSeconds: number,
    private readonly persistSession: PersistSession,
    private readonly checkpointSeconds = 15
  ) {}

  setIdleThreshold(seconds: number): void {
    this.idleThresholdSeconds = Math.max(60, Math.min(1800, Math.floor(seconds)));
  }

  start(): void {
    this.running = true;
  }

  async stop(at: Date): Promise<void> {
    this.running = false;
    await this.flush(at, 'shutdown');
  }

  async pause(at: Date): Promise<void> {
    if (this.paused) {
      return;
    }

    this.paused = true;
    await this.flush(at, 'manual-pause');
  }

  resume(): void {
    this.paused = false;
  }

  async onSuspend(at: Date): Promise<void> {
    await this.flush(at, 'suspend');
  }

  onResume(): void {
    this.segment = null;
  }

  async tick(at: Date, app: ActiveApp | null, idleSeconds: number): Promise<void> {
    if (!this.running || this.paused) {
      return;
    }

    this.idleSeconds = Math.max(0, Math.floor(idleSeconds));
    const nextIdle = this.idleSeconds >= this.idleThresholdSeconds;
    this.idle = nextIdle;

    const nextApp = app ?? UNKNOWN_APP;

    if (!this.segment) {
      this.segment = {
        app: nextApp,
        startedAt: at,
        isIdle: nextIdle
      };
      return;
    }

    if (this.segment.isIdle !== nextIdle || !this.isSameApp(this.segment.app, nextApp)) {
      await this.flush(at, 'focus-change');
      this.segment = {
        app: nextApp,
        startedAt: at,
        isIdle: nextIdle
      };
      return;
    }

    const segmentAgeSeconds = Math.floor((at.getTime() - this.segment.startedAt.getTime()) / 1000);
    if (segmentAgeSeconds >= this.checkpointSeconds) {
      await this.flush(at, 'heartbeat');
      this.segment = {
        app: nextApp,
        startedAt: at,
        isIdle: nextIdle
      };
    }
  }

  getStatus(): TrackerStatus {
    return {
      running: this.running,
      paused: this.paused,
      idle: this.idle,
      currentApp: this.segment?.app.appName ?? null,
      idleSeconds: this.idleSeconds
    };
  }

  private async flush(endAt: Date, source: string): Promise<void> {
    if (!this.segment) {
      return;
    }

    const durationSec = Math.floor((endAt.getTime() - this.segment.startedAt.getTime()) / 1000);

    const payload: SessionInput = {
      appName: this.segment.app.appName,
      exePath: this.segment.app.exePath,
      startedAt: this.segment.startedAt.toISOString(),
      endedAt: endAt.toISOString(),
      durationSec,
      isIdleSegment: this.segment.isIdle,
      source
    };

    await this.persistSession(payload);
    this.segment = null;
  }

  private isSameApp(left: ActiveApp, right: ActiveApp): boolean {
    return left.appName === right.appName && left.exePath === right.exePath;
  }
}
