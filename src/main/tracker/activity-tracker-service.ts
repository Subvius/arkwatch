import type { ActivitySource } from './types';
import type { TrackerStatus } from '../../shared/types';
import { ActivityTrackerCore } from './activity-tracker-core';
import { ArkWatchDatabase } from '../db/database';

export class ActivityTrackerService {
  private intervalId: NodeJS.Timeout | null = null;
  private readonly core: ActivityTrackerCore;

  constructor(
    private readonly source: ActivitySource,
    private readonly database: ArkWatchDatabase,
    idleThresholdSeconds: number,
    private readonly pollIntervalMs = 1000
  ) {
    this.core = new ActivityTrackerCore(idleThresholdSeconds, async (session) => {
      await this.database.insertSession(session);
    });
  }

  async start(): Promise<void> {
    this.core.start();

    this.source.onSuspend(() => {
      void this.core.onSuspend(new Date());
    });

    this.source.onResume(() => {
      this.core.onResume();
    });

    this.intervalId = setInterval(() => {
      void this.pollOnce();
    }, this.pollIntervalMs);

    await this.pollOnce();
  }

  async stop(): Promise<void> {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }

    await this.core.stop(new Date());
  }

  async pause(): Promise<TrackerStatus> {
    await this.core.pause(new Date());
    return this.core.getStatus();
  }

  async resume(): Promise<TrackerStatus> {
    this.core.resume();
    await this.pollOnce();
    return this.core.getStatus();
  }

  async toggle(): Promise<TrackerStatus> {
    const status = this.core.getStatus();
    if (status.paused) {
      return this.resume();
    }

    return this.pause();
  }

  getStatus(): TrackerStatus {
    return this.core.getStatus();
  }

  setIdleThreshold(seconds: number): void {
    this.core.setIdleThreshold(seconds);
  }

  private async pollOnce(): Promise<void> {
    try {
      const [app, idleSeconds] = await Promise.all([this.source.getActiveApp(), Promise.resolve(this.source.getIdleSeconds())]);
      await this.core.tick(new Date(), app, idleSeconds);
    } catch {
      await this.core.tick(new Date(), null, this.source.getIdleSeconds());
    }
  }
}
