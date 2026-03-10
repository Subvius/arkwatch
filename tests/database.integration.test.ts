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

  it('returns AI daily active seconds and launch counts', async () => {
    await db.insertSession({
      appName: 'Codex',
      exePath: 'codex.exe',
      startedAt: '2026-03-10T08:00:00.000Z',
      endedAt: '2026-03-10T08:00:30.000Z',
      durationSec: 30,
      isIdleSegment: false,
      source: 'background-process'
    });

    await db.insertSession({
      appName: 'Codex',
      exePath: 'codex.exe',
      startedAt: '2026-03-10T08:00:30.000Z',
      endedAt: '2026-03-10T08:01:00.000Z',
      durationSec: 30,
      isIdleSegment: false,
      source: 'background-process'
    });

    await db.insertSession({
      appName: 'Codex',
      exePath: 'codex.exe',
      startedAt: '2026-03-10T10:00:00.000Z',
      endedAt: '2026-03-10T10:00:20.000Z',
      durationSec: 20,
      isIdleSegment: false,
      source: 'background-process'
    });

    await db.insertSession({
      appName: 'Claude Code',
      exePath: 'claude.exe',
      startedAt: '2026-03-10T09:00:00.000Z',
      endedAt: '2026-03-10T09:02:00.000Z',
      durationSec: 120,
      isIdleSegment: false,
      source: 'background-process'
    });

    await db.insertSession({
      appName: 'Claude Code',
      exePath: 'claude.exe',
      startedAt: '2026-03-10T09:02:00.000Z',
      endedAt: '2026-03-10T09:03:00.000Z',
      durationSec: 60,
      isIdleSegment: true,
      source: 'background-process'
    });

    const aiStats = await db.getAIToolDailyStats({
      from: '2026-03-10T00:00:00.000Z',
      to: '2026-03-10T23:59:59.999Z'
    });

    const codex = aiStats.find((stat) => stat.id === 'codex');
    const claude = aiStats.find((stat) => stat.id === 'claude');

    expect(codex).toEqual({ id: 'codex', activeSeconds: 80, sessionCount: 2 });
    expect(claude).toEqual({ id: 'claude', activeSeconds: 120, sessionCount: 1 });
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
