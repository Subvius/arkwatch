import { describe, expect, it } from 'vitest';
import { ActivityTrackerCore } from '../src/main/tracker/activity-tracker-core';
import type { SessionInput } from '../src/shared/types';

const appA = { appName: 'Code.exe', exePath: 'C:/Code.exe' };
const appB = { appName: 'Chrome.exe', exePath: 'C:/Chrome.exe' };

describe('ActivityTrackerCore', () => {
  it('segments sessions when active app changes', async () => {
    const sessions: SessionInput[] = [];
    const tracker = new ActivityTrackerCore(300, async (session) => {
      sessions.push(session);
    });

    tracker.start();

    await tracker.tick(new Date('2026-03-10T10:00:00.000Z'), appA, 0);
    await tracker.tick(new Date('2026-03-10T10:00:10.000Z'), appB, 0);
    await tracker.tick(new Date('2026-03-10T10:00:20.000Z'), appB, 0);
    await tracker.stop(new Date('2026-03-10T10:00:30.000Z'));

    expect(sessions).toHaveLength(2);
    expect(sessions[0]).toMatchObject({ appName: 'Code.exe', durationSec: 10, isIdleSegment: false, source: 'focus-change' });
    expect(sessions[1]).toMatchObject({ appName: 'Chrome.exe', durationSec: 20, isIdleSegment: false, source: 'shutdown' });
  });

  it('stops tracking when there is no active app instead of persisting Unknown', async () => {
    const sessions: SessionInput[] = [];
    const tracker = new ActivityTrackerCore(300, async (session) => {
      sessions.push(session);
    });

    tracker.start();

    await tracker.tick(new Date('2026-03-10T09:00:00.000Z'), appA, 0);
    await tracker.tick(new Date('2026-03-10T09:00:10.000Z'), null, 0);

    expect(tracker.getStatus()).toMatchObject({ currentApp: null });

    await tracker.stop(new Date('2026-03-10T09:00:20.000Z'));

    expect(sessions).toHaveLength(1);
    expect(sessions[0]).toMatchObject({ appName: 'Code.exe', durationSec: 10, isIdleSegment: false, source: 'focus-change' });
  });

  it('starts idle segment when threshold is reached', async () => {
    const sessions: SessionInput[] = [];
    const tracker = new ActivityTrackerCore(300, async (session) => {
      sessions.push(session);
    });

    tracker.start();

    await tracker.tick(new Date('2026-03-10T08:00:00.000Z'), appA, 299);
    await tracker.tick(new Date('2026-03-10T08:05:01.000Z'), appA, 301);
    await tracker.stop(new Date('2026-03-10T08:06:00.000Z'));

    expect(sessions).toHaveLength(2);
    expect(sessions[0]).toMatchObject({ durationSec: 301, isIdleSegment: false, source: 'focus-change' });
    expect(sessions[1]).toMatchObject({ durationSec: 59, isIdleSegment: true, source: 'shutdown' });
  });

  it('flushes on pause and resumes tracking', async () => {
    const sessions: SessionInput[] = [];
    const tracker = new ActivityTrackerCore(300, async (session) => {
      sessions.push(session);
    });

    tracker.start();
    await tracker.tick(new Date('2026-03-10T11:00:00.000Z'), appA, 0);
    await tracker.pause(new Date('2026-03-10T11:00:30.000Z'));

    expect(tracker.getStatus().paused).toBe(true);

    tracker.resume();
    await tracker.tick(new Date('2026-03-10T11:00:41.000Z'), appA, 0);
    await tracker.stop(new Date('2026-03-10T11:01:01.000Z'));

    expect(sessions).toHaveLength(2);
    expect(sessions[0]).toMatchObject({ durationSec: 30, source: 'manual-pause' });
    expect(sessions[1]).toMatchObject({ durationSec: 20, source: 'shutdown' });
  });
});

