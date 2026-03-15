import type { ActiveApp, ActivitySource } from './types';
import type { TrackerStatus } from '../../shared/types';
import { ActivityTrackerCore } from './activity-tracker-core';
import { ArkWatchDatabase } from '../db/database';
import { isTrackableForegroundApp } from '../lib/app-tracking-policy';

/** Lowercase exe basenames of common terminal emulators (Windows). */
const TERMINAL_EXE_NAMES = new Set([
  'windowsterminal.exe',
  'cmd.exe',
  'powershell.exe',
  'pwsh.exe',
  'mintty.exe',
  'git-bash.exe',
  'conemu64.exe',
  'conemuc64.exe',
  'hyper.exe',
  'alacritty.exe',
  'wezterm-gui.exe',
  'wt.exe',
  'bash.exe',
  'wsl.exe'
]);

const isTerminalApp = (app: ActiveApp): boolean => {
  if (!app.exePath) return false;
  const basename = app.exePath.split(/[\\/]/).pop()?.toLowerCase() ?? '';
  return TERMINAL_EXE_NAMES.has(basename);
};

export type ClaudeRunningProvider = () => ActiveApp | null;

const hasTrackerStatusChanged = (previous: TrackerStatus, next: TrackerStatus): boolean => (
  previous.running !== next.running ||
  previous.paused !== next.paused ||
  previous.idle !== next.idle ||
  previous.currentApp !== next.currentApp ||
  previous.idleSeconds !== next.idleSeconds
);

export class ActivityTrackerService {
  private intervalId: NodeJS.Timeout | null = null;
  private readonly core: ActivityTrackerCore;
  private readonly statusListeners = new Set<(status: TrackerStatus) => void>();

  constructor(
    private readonly source: ActivitySource,
    private readonly database: ArkWatchDatabase,
    private idleThresholdSeconds: number,
    private readonly pollIntervalMs = 1000,
    private readonly getClaudeApp?: ClaudeRunningProvider
  ) {
    this.core = new ActivityTrackerCore(this.idleThresholdSeconds, async (session) => {
      await this.database.insertSession(session);
    });
  }

  async start(): Promise<void> {
    this.core.start();

    this.source.onSuspend(() => {
      void this.core.onSuspend(new Date()).then(() => {
        this.emitStatusChanged();
      });
    });

    this.source.onResume(() => {
      this.core.onResume();
      this.emitStatusChanged();
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

    try {
      await this.core.stop(new Date());
    } finally {
      this.statusListeners.clear();
    }
  }

  async pause(): Promise<TrackerStatus> {
    await this.core.pause(new Date());
    const status = this.core.getStatus();
    this.emitStatusChanged(status);
    return status;
  }

  async resume(): Promise<TrackerStatus> {
    this.core.resume();
    await this.pollOnce();
    const status = this.core.getStatus();
    this.emitStatusChanged(status);
    return status;
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

  onStatusChanged(listener: (status: TrackerStatus) => void): () => void {
    this.statusListeners.add(listener);
    return () => {
      this.statusListeners.delete(listener);
    };
  }

  setIdleThreshold(seconds: number): void {
    this.idleThresholdSeconds = seconds;
    this.core.setIdleThreshold(seconds);
  }

  private async pollOnce(): Promise<void> {
    const [appResult, idleResult] = await Promise.allSettled([
      this.source.getActiveApp(),
      Promise.resolve().then(() => this.source.getIdleSeconds(this.idleThresholdSeconds))
    ]);

    let app = appResult.status === 'fulfilled' ? appResult.value : null;
    const idleSeconds = idleResult.status === 'fulfilled' ? idleResult.value : 0;

    // When a terminal is focused and Claude Code is running, attribute time to Claude Code
    if (app && this.getClaudeApp && isTerminalApp(app)) {
      const claudeApp = this.getClaudeApp();
      if (claudeApp) {
        app = claudeApp;
      }
    }

    if (!isTrackableForegroundApp(app)) {
      app = null;
    }

    const previousStatus = this.core.getStatus();
    await this.core.tick(new Date(), app, idleSeconds);

    const nextStatus = this.core.getStatus();
    if (hasTrackerStatusChanged(previousStatus, nextStatus)) {
      this.emitStatusChanged(nextStatus);
    }
  }

  private emitStatusChanged(status = this.core.getStatus()): void {
    for (const listener of this.statusListeners) {
      listener(status);
    }
  }
}

