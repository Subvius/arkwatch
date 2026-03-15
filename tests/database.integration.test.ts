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

  it('hides ignored lock and unknown sessions from user-facing stats', async () => {
    const now = new Date();
    const activeStart = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 10, 0, 0, 0);
    const unknownStart = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 11, 0, 0, 0);
    const lockStart = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 12, 0, 0, 0);

    await db.insertSession({
      appName: 'Code',
      exePath: 'C:/Code.exe',
      startedAt: activeStart.toISOString(),
      endedAt: new Date(activeStart.getTime() + 600_000).toISOString(),
      durationSec: 600,
      isIdleSegment: false,
      source: 'focus-change'
    });

    await db.insertSession({
      appName: 'Unknown',
      exePath: null,
      startedAt: unknownStart.toISOString(),
      endedAt: new Date(unknownStart.getTime() + 300_000).toISOString(),
      durationSec: 300,
      isIdleSegment: false,
      source: 'focus-change'
    });

    await db.insertSession({
      appName: 'LockApp.exe',
      exePath: 'C:/Windows/SystemApps/Microsoft.LockApp_cw5n1h2txyewy/LockApp.exe',
      startedAt: lockStart.toISOString(),
      endedAt: new Date(lockStart.getTime() + 180_000).toISOString(),
      durationSec: 180,
      isIdleSegment: false,
      source: 'focus-change'
    });

    await db.insertSession({
      appName: 'Windows Shell Experience Host',
      exePath: 'C:/Windows/SystemApps/ShellExperienceHost_cw5n1h2txyewy/ShellExperienceHost.exe',
      startedAt: new Date(now.getFullYear(), now.getMonth(), now.getDate(), 12, 15, 0, 0).toISOString(),
      endedAt: new Date(now.getFullYear(), now.getMonth(), now.getDate(), 12, 16, 0, 0).toISOString(),
      durationSec: 60,
      isIdleSegment: false,
      source: 'focus-change'
    });

    await db.insertSession({
      appName: 'Application Frame Host',
      exePath: 'C:/Windows/System32/ApplicationFrameHost.exe',
      startedAt: new Date(now.getFullYear(), now.getMonth(), now.getDate(), 12, 17, 0, 0).toISOString(),
      endedAt: new Date(now.getFullYear(), now.getMonth(), now.getDate(), 12, 17, 30, 0).toISOString(),
      durationSec: 30,
      isIdleSegment: false,
      source: 'focus-change'
    });

    await db.insertSession({
      appName: 'Windows Start Experience Host',
      exePath: 'C:/Windows/SystemApps/Microsoft.Windows.StartMenuExperienceHost_cw5n1h2txyewy/StartMenuExperienceHost.exe',
      startedAt: new Date(now.getFullYear(), now.getMonth(), now.getDate(), 12, 18, 0, 0).toISOString(),
      endedAt: new Date(now.getFullYear(), now.getMonth(), now.getDate(), 12, 18, 10, 0).toISOString(),
      durationSec: 10,
      isIdleSegment: false,
      source: 'focus-change'
    });

    await db.insertSession({
      appName: 'SearchHost.exe',
      exePath: 'C:/Windows/SystemApps/MicrosoftWindows.Client.CBS_cw5n1h2txyewy/SearchHost.exe',
      startedAt: new Date(now.getFullYear(), now.getMonth(), now.getDate(), 12, 19, 0, 0).toISOString(),
      endedAt: new Date(now.getFullYear(), now.getMonth(), now.getDate(), 12, 19, 15, 0).toISOString(),
      durationSec: 15,
      isIdleSegment: false,
      source: 'focus-change'
    });

    const from = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
    const to = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999).toISOString();

    const summary = await db.getSummary({ from, to });
    const topApps = await db.getTopApps({ from, to }, 10);
    const codeUsage = await db.getAppUsageToday('Code');
    const unknownUsage = await db.getAppUsageToday('Unknown');

    expect(summary.totalActiveSeconds).toBe(600);
    expect(summary.totalTrackedSeconds).toBe(600);
    expect(topApps).toHaveLength(1);
    expect(topApps[0]).toMatchObject({ appName: 'Code', activeSeconds: 600 });
    expect(codeUsage).toBe(600);
    expect(unknownUsage).toBe(0);
  });

  it('prefers the most recently seen executable path for top-app icon resolution', async () => {
    await db.insertSession({
      appName: 'Photos.exe',
      exePath: 'C:/Program Files/WindowsApps/Microsoft.Windows.Photos_2025.11120.5001.0_x64__8wekyb3d8bbwe/Photos.exe',
      startedAt: '2026-03-10T10:00:00.000Z',
      endedAt: '2026-03-10T10:10:00.000Z',
      durationSec: 600,
      isIdleSegment: false,
      source: 'focus-change'
    });

    await db.insertSession({
      appName: 'Photos.exe',
      exePath: 'C:/Program Files/WindowsApps/Microsoft.Windows.Photos_2026.11020.20001.0_x64__8wekyb3d8bbwe/Photos.exe',
      startedAt: '2026-03-15T10:00:00.000Z',
      endedAt: '2026-03-15T10:05:00.000Z',
      durationSec: 300,
      isIdleSegment: false,
      source: 'focus-change'
    });

    const topApps = await db.getTopApps({
      from: '2026-03-10T00:00:00.000Z',
      to: '2026-03-15T23:59:59.999Z'
    }, 5);

    expect(topApps).toHaveLength(1);
    expect(topApps[0]).toMatchObject({
      appName: 'Photos.exe',
      activeSeconds: 900,
      exePath: 'C:/Program Files/WindowsApps/Microsoft.Windows.Photos_2026.11020.20001.0_x64__8wekyb3d8bbwe/Photos.exe'
    });
  });
  it('returns AI daily active seconds and launch counts', async () => {
    // Background-process sessions: used for session counting only, NOT active seconds
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

    // Foreground sessions: these count toward active seconds
    await db.insertSession({
      appName: 'Codex',
      exePath: 'codex.exe',
      startedAt: '2026-03-10T08:00:00.000Z',
      endedAt: '2026-03-10T08:01:20.000Z',
      durationSec: 80,
      isIdleSegment: false,
      source: 'focus-change'
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

    // Claude foreground session (terminal rewritten to Claude Code)
    await db.insertSession({
      appName: 'Claude Code',
      exePath: 'claude.exe',
      startedAt: '2026-03-10T09:00:00.000Z',
      endedAt: '2026-03-10T09:02:00.000Z',
      durationSec: 120,
      isIdleSegment: false,
      source: 'focus-change'
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




