import os from 'node:os';
import path from 'node:path';
import { promises as fs } from 'node:fs';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { ArkWatchDatabase } from '../src/main/db/database';

describe('ArkWatchDatabase', () => {
  let tempDir = '';
  let db: ArkWatchDatabase;

  beforeEach(async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'arkwatch-test-'));
    db = new ArkWatchDatabase(path.join(tempDir, 'arkwatch.db'));
    await db.init();
  });

  afterEach(async () => {
    await db.close();
    await fs.rm(tempDir, { recursive: true, force: true });
  });

  it('stores sessions and returns summary aggregates', async () => {
    await db.insertSession({
      appName: 'Code',
      exePath: 'C:/Code.exe',
      startedAt: '2026-03-09T10:00:00.000Z',
      endedAt: '2026-03-09T10:30:00.000Z',
      durationSec: 1800,
      isIdleSegment: false,
      source: 'focus-change'
    });

    await db.insertSession({
      appName: 'Code',
      exePath: 'C:/Code.exe',
      startedAt: '2026-03-09T10:30:00.000Z',
      endedAt: '2026-03-09T10:35:00.000Z',
      durationSec: 300,
      isIdleSegment: true,
      source: 'focus-change'
    });

    await db.insertSession({
      appName: 'Chrome',
      exePath: 'C:/Chrome.exe',
      startedAt: '2026-03-10T09:00:00.000Z',
      endedAt: '2026-03-10T09:45:00.000Z',
      durationSec: 2700,
      isIdleSegment: false,
      source: 'shutdown'
    });

    const summary = await db.getSummary({
      from: '2026-03-09T00:00:00.000Z',
      to: '2026-03-10T23:59:59.999Z'
    });

    expect(summary.totalActiveSeconds).toBe(4500);
    expect(summary.totalIdleSeconds).toBe(300);
    expect(summary.totalTrackedSeconds).toBe(4800);

    const topApps = await db.getTopApps(
      {
        from: '2026-03-09T00:00:00.000Z',
        to: '2026-03-10T23:59:59.999Z'
      },
      3
    );

    expect(topApps[0]).toMatchObject({ appName: 'Chrome', activeSeconds: 2700 });
    expect(topApps[1]).toMatchObject({ appName: 'Code', activeSeconds: 1800 });
  });

  it('persists and validates settings', async () => {
    const updated = await db.updateSettings({
      idleThresholdSeconds: 420,
      launchAtLogin: false
    });

    expect(updated.idleThresholdSeconds).toBe(420);
    expect(updated.launchAtLogin).toBe(false);

    const fetched = await db.getSettings();
    expect(fetched).toEqual(updated);
  });
});
