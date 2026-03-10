import { activeWindow } from 'active-win';
import { powerMonitor } from 'electron';
import type { ActivitySource, ActiveApp } from './types';

export class ElectronActivitySource implements ActivitySource {
  onSuspend(cb: () => void): void {
    powerMonitor.on('suspend', cb);
  }

  onResume(cb: () => void): void {
    powerMonitor.on('resume', cb);
  }

  async getActiveApp(): Promise<ActiveApp | null> {
    const result = await activeWindow();

    if (!result) {
      return null;
    }

    return {
      appName: result.owner?.name || result.title || 'Unknown',
      exePath: result.owner?.path || null
    };
  }

  getIdleSeconds(idleThresholdSeconds = 300): number {
    try {
      const idleSeconds = powerMonitor.getSystemIdleTime();
      if (Number.isFinite(idleSeconds) && idleSeconds >= 0) {
        return idleSeconds;
      }
    } catch {
      // Fallback below.
    }

    try {
      const idleState = powerMonitor.getSystemIdleState(idleThresholdSeconds);
      if (idleState === 'idle' || idleState === 'locked') {
        return idleThresholdSeconds;
      }
    } catch {
      // Best-effort fallback.
    }

    return 0;
  }
}
