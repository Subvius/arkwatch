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

  getIdleSeconds(): number {
    return powerMonitor.getSystemIdleTime();
  }
}

