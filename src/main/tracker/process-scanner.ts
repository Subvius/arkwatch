import { exec } from 'node:child_process';
import { promisify } from 'node:util';
import type { SessionInput } from '../../shared/types';

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

export const scanBackgroundProcesses = async (): Promise<Map<string, BackgroundProcess>> => {
  const results = mapProcessNamesToAITools([]);

  try {
    const { stdout } = await execAsync('tasklist /FO CSV /NH', {
      windowsHide: true,
      timeout: 5000
    });

    return mapProcessNamesToAITools(parseTasklistCsvOutput(stdout));
  } catch {
    // Silently fail - process scanning is best-effort
  }

  return results;
};

type ActiveSession = {
  rule: ProcessRule;
  startedAt: Date;
};

export class BackgroundProcessTracker {
  private activeSessions = new Map<string, ActiveSession>();
  private intervalId: NodeJS.Timeout | null = null;

  constructor(
    private readonly persistSession: (session: SessionInput) => Promise<void>,
    private readonly pollIntervalMs = 10_000
  ) {}

  start(): void {
    this.intervalId = setInterval(() => {
      void this.poll();
    }, this.pollIntervalMs);

    void this.poll();
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
  }

  private async poll(): Promise<void> {
    const processes = await scanBackgroundProcesses();
    const now = new Date();

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
