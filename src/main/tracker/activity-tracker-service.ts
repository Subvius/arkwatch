import type { ActiveApp, ActivitySource } from './types';
import type { TrackerStatus } from '../../shared/types';
import { ActivityTrackerCore } from './activity-tracker-core';
import { ArkWatchDatabase } from '../db/database';

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

export class ActivityTrackerService {
  private intervalId: NodeJS.Timeout | null = null;
  private readonly core: ActivityTrackerCore;

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

    await this.core.tick(new Date(), app, idleSeconds);
  }
}

