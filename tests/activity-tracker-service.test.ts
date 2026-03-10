import { describe, expect, it, vi } from 'vitest';
import { ActivityTrackerService } from '../src/main/tracker/activity-tracker-service';
import type { ActivitySource } from '../src/main/tracker/types';
import type { ArkWatchDatabase } from '../src/main/db/database';

const appA = { appName: 'Code.exe', exePath: 'C:/Code.exe' };

const createMockDatabase = (): ArkWatchDatabase =>
  ({
    insertSession: vi.fn(async () => undefined)
  } as unknown as ArkWatchDatabase);

describe('ActivityTrackerService', () => {
  it('keeps status updates working when idle-time lookup fails', async () => {
    const source: ActivitySource = {
      getActiveApp: vi.fn(async () => appA),
      getIdleSeconds: vi.fn(() => {
        throw new Error('idle unsupported');
      }),
      onSuspend: vi.fn(),
      onResume: vi.fn()
    };

    const service = new ActivityTrackerService(source, createMockDatabase(), 120, 60_000);
    await service.start();

    expect(service.getStatus()).toMatchObject({
      idle: false,
      currentApp: 'Code.exe'
    });

    await service.stop();
  });

  it('passes the configured idle threshold to the activity source', async () => {
    const source: ActivitySource = {
      getActiveApp: vi.fn(async () => appA),
      getIdleSeconds: vi.fn((threshold = 0) => threshold),
      onSuspend: vi.fn(),
      onResume: vi.fn()
    };

    const service = new ActivityTrackerService(source, createMockDatabase(), 120, 60_000);
    await service.start();

    expect(service.getStatus()).toMatchObject({
      idle: true,
      idleSeconds: 120
    });

    service.setIdleThreshold(240);
    await service.pause();
    await service.resume();

    expect(source.getIdleSeconds).toHaveBeenLastCalledWith(240);
    expect(service.getStatus()).toMatchObject({
      idle: true,
      idleSeconds: 240
    });

    await service.stop();
  });
});
