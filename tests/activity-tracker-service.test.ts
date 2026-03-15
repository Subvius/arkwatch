import { describe, expect, it, vi } from 'vitest';
import { ActivityTrackerService } from '../src/main/tracker/activity-tracker-service';
import type { ActivitySource } from '../src/main/tracker/types';
import type { ArkWatchDatabase } from '../src/main/db/database';

const appA = { appName: 'Code.exe', exePath: 'C:/Code.exe' };
const lockApp = {
  appName: 'LockApp.exe',
  exePath: 'C:/Windows/SystemApps/Microsoft.LockApp_cw5n1h2txyewy/LockApp.exe'
};

const createMockDatabase = (): { database: ArkWatchDatabase; insertSession: ReturnType<typeof vi.fn> } => {
  const insertSession = vi.fn(async () => undefined);
  return {
    database: ({
      insertSession
    } as unknown) as ArkWatchDatabase,
    insertSession
  };
};

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

    const mockDb = createMockDatabase();
    const service = new ActivityTrackerService(source, mockDb.database, 120, 60_000);
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

    const mockDb = createMockDatabase();
    const service = new ActivityTrackerService(source, mockDb.database, 120, 60_000);
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

  it('ignores lock screen apps instead of tracking them as foreground usage', async () => {
    const source: ActivitySource = {
      getActiveApp: vi.fn(async () => lockApp),
      getIdleSeconds: vi.fn(() => 0),
      onSuspend: vi.fn(),
      onResume: vi.fn()
    };

    const mockDb = createMockDatabase();
    const service = new ActivityTrackerService(source, mockDb.database, 120, 60_000);
    await service.start();

    expect(service.getStatus()).toMatchObject({
      currentApp: null,
      idle: false
    });

    await service.stop();

    expect(mockDb.insertSession).not.toHaveBeenCalled();
  });
});

