import { exec } from 'node:child_process';
import { promisify } from 'node:util';
import type { AIToolProcess, SessionInput } from '../../shared/types';
import type { ActiveApp } from './types';

const execAsync = promisify(exec);

export type BackgroundProcess = {
  name: string;
  running: boolean;
};

type ProcessRule = {
  id: string;
  appName: string;
  exePath: string;
  match: (processName: string) => boolean;
};

const PROCESS_RULES: ProcessRule[] = [
  {
    id: 'claude',
    appName: 'Claude Code',
    exePath: 'claude.exe',
    match: (name) => name.toLowerCase() === 'claude.exe'
  },
  {
    id: 'codex',
    appName: 'Codex',
    exePath: 'codex.exe',
    match: (name) => {
      const normalized = name.toLowerCase().trim();
      return normalized === 'codex.exe' || normalized === 'codex' || normalized.includes('codex');
    }
  }
];

export const parseTasklistCsvOutput = (stdout: string): string[] =>
  stdout
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const match = line.match(/^"([^"]+)"/);
      return match ? match[1] : null;
    })
    .filter((name): name is string => Boolean(name));

export const mapProcessNamesToAITools = (processNames: string[]): Map<string, BackgroundProcess> => {
  const results = new Map<string, BackgroundProcess>();

  for (const rule of PROCESS_RULES) {
    results.set(rule.id, { name: rule.appName, running: false });
  }

  for (const processName of processNames) {
    for (const rule of PROCESS_RULES) {
      if (rule.match(processName)) {
        results.set(rule.id, { name: rule.appName, running: true });
      }
    }
  }

  return results;
};

const toProcessSnapshot = (processes: Map<string, BackgroundProcess>): ReadonlyArray<AIToolProcess> =>
  PROCESS_RULES.map((rule) => {
    const info = processes.get(rule.id);
    return {
      id: rule.id,
      name: info?.name ?? rule.appName,
      running: info?.running ?? false
    } satisfies AIToolProcess;
  });

const areSnapshotsEqual = (left: ReadonlyArray<AIToolProcess>, right: ReadonlyArray<AIToolProcess>): boolean =>
  left.length === right.length &&
  left.every((item, index) => {
    const other = right[index];
    return other !== undefined && item.id === other.id && item.name === other.name && item.running === other.running;
  });

const notifyListener = (
  listener: (processes: ReadonlyArray<AIToolProcess>) => void,
  processes: ReadonlyArray<AIToolProcess>
): void => {
  try {
    listener(processes);
  } catch (error) {
    console.error('[process-scanner] process listener failed', error);
  }
};

export const scanBackgroundProcesses = async (): Promise<Map<string, BackgroundProcess> | null> => {
  try {
    const { stdout } = await execAsync('tasklist /FO CSV /NH', {
      windowsHide: true,
      timeout: 5000
    });

    return mapProcessNamesToAITools(parseTasklistCsvOutput(stdout));
  } catch (error) {
    console.error('[process-scanner] background scan failed', error);
    return null;
  }
};

type ActiveSession = {
  rule: ProcessRule;
  startedAt: Date;
};

export class BackgroundProcessTracker {
  private activeSessions = new Map<string, ActiveSession>();
  private intervalId: NodeJS.Timeout | null = null;
  private readonly listeners = new Set<(processes: ReadonlyArray<AIToolProcess>) => void>();
  private lastSnapshot: ReadonlyArray<AIToolProcess> = toProcessSnapshot(mapProcessNamesToAITools([]));

  constructor(
    private readonly persistSession: (session: SessionInput) => Promise<void>,
    private readonly pollIntervalMs = 10_000
  ) {}

  /** Returns the ActiveApp for a running AI tool, or null if not running. */
  getRunningToolApp(toolId: string): ActiveApp | null {
    const session = this.activeSessions.get(toolId);
    if (!session) return null;
    return { appName: session.rule.appName, exePath: session.rule.exePath };
  }

  getProcessesSnapshot(): ReadonlyArray<AIToolProcess> {
    return this.lastSnapshot;
  }

  onProcessesChanged(callback: (processes: ReadonlyArray<AIToolProcess>) => void): () => void {
    this.listeners.add(callback);
    notifyListener(callback, this.lastSnapshot);

    return () => {
      this.listeners.delete(callback);
    };
  }

  start(): void {
    this.intervalId = setInterval(() => {
      void this.poll();
    }, this.pollIntervalMs);

    void this.poll();
  }

  async pollNow(): Promise<ReadonlyArray<AIToolProcess>> {
    await this.poll();
    return this.lastSnapshot;
  }

  async stop(): Promise<void> {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }

    // Flush all active sessions
    const now = new Date();
    for (const [id, session] of this.activeSessions) {
      await this.flush(id, session, now);
    }
    this.activeSessions.clear();
    this.publishSnapshot(mapProcessNamesToAITools([]));
  }

  private publishSnapshot(processes: Map<string, BackgroundProcess>): void {
    const nextSnapshot = toProcessSnapshot(processes);
    if (areSnapshotsEqual(this.lastSnapshot, nextSnapshot)) {
      return;
    }

    this.lastSnapshot = nextSnapshot;
    for (const listener of this.listeners) {
      notifyListener(listener, nextSnapshot);
    }
  }

  private async poll(): Promise<void> {
    const processes = await scanBackgroundProcesses();
    if (processes === null) {
      return;
    }

    const now = new Date();

    this.publishSnapshot(processes);

    for (const rule of PROCESS_RULES) {
      const info = processes.get(rule.id);
      const isRunning = info?.running ?? false;
      const existing = this.activeSessions.get(rule.id);

      if (isRunning && !existing) {
        // Process just started - begin tracking
        this.activeSessions.set(rule.id, { rule, startedAt: now });
      } else if (!isRunning && existing) {
        // Process stopped - flush the session
        await this.flush(rule.id, existing, now);
        this.activeSessions.delete(rule.id);
      } else if (isRunning && existing) {
        // Still running - checkpoint every 30s to avoid data loss
        const elapsed = (now.getTime() - existing.startedAt.getTime()) / 1000;
        if (elapsed >= 30) {
          await this.flush(rule.id, existing, now);
          this.activeSessions.set(rule.id, { rule, startedAt: now });
        }
      }
    }
  }

  private async flush(id: string, session: ActiveSession, endAt: Date): Promise<void> {
    const durationSec = Math.floor((endAt.getTime() - session.startedAt.getTime()) / 1000);
    if (durationSec < 1) return;

    await this.persistSession({
      appName: session.rule.appName,
      exePath: session.rule.exePath,
      startedAt: session.startedAt.toISOString(),
      endedAt: endAt.toISOString(),
      durationSec,
      isIdleSegment: false,
      source: 'background-process'
    });
  }
}
