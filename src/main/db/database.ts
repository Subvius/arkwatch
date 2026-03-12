import path from 'node:path';
import { promises as fs } from 'node:fs';
import { Database, open } from 'sqlite';
import sqlite3 from 'sqlite3';
import type { AIToolDailyStat, AppSettings, DateRange, SessionInput, SummaryStats, TopAppStat } from '../../shared/types';

const DEFAULT_SETTINGS: AppSettings = {
  idleThresholdSeconds: 300,
  launchAtLogin: true,
  theme: 'light'
};

type AIToolId = 'claude' | 'codex';

const AI_TOOLS: Array<{ id: AIToolId; keyword: string }> = [
  { id: 'claude', keyword: 'claude' },
  { id: 'codex', keyword: 'codex' }
];

const resolveAIToolId = (appName: string, exePath: string | null): AIToolId | null => {
  const normalizedName = appName.toLowerCase();
  const normalizedPath = (exePath ?? '').toLowerCase();

  for (const tool of AI_TOOLS) {
    if (normalizedName.includes(tool.keyword) || normalizedPath.includes(tool.keyword)) {
      return tool.id;
    }
  }

  return null;
};

export class ArkWatchDatabase {
  private db: Database | null = null;

  constructor(private readonly dbPath: string) {}

  async init(): Promise<void> {
    await fs.mkdir(path.dirname(this.dbPath), { recursive: true });

    this.db = await open({
      filename: this.dbPath,
      driver: sqlite3.Database
    });

    await this.db.exec(`
      PRAGMA journal_mode = WAL;

      CREATE TABLE IF NOT EXISTS sessions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        app_name TEXT NOT NULL,
        exe_path TEXT,
        started_at TEXT NOT NULL,
        ended_at TEXT NOT NULL,
        duration_sec INTEGER NOT NULL CHECK(duration_sec >= 0),
        is_idle_segment INTEGER NOT NULL CHECK(is_idle_segment IN (0, 1)),
        source TEXT NOT NULL
      );

      CREATE INDEX IF NOT EXISTS idx_sessions_started_at ON sessions(started_at);
      CREATE INDEX IF NOT EXISTS idx_sessions_app_name ON sessions(app_name);

      CREATE TABLE IF NOT EXISTS settings (
        key TEXT PRIMARY KEY,
        value_json TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );
    `);

    await this.ensureDefaultSettings();
  }

  async close(): Promise<void> {
    if (!this.db) {
      return;
    }

    await this.db.close();
    this.db = null;
  }

  async insertSession(session: SessionInput): Promise<void> {
    const db = this.requireDb();

    if (session.durationSec <= 0) {
      return;
    }

    await db.run(
      `
      INSERT INTO sessions (app_name, exe_path, started_at, ended_at, duration_sec, is_idle_segment, source)
      VALUES (?, ?, ?, ?, ?, ?, ?)
      `,
      session.appName,
      session.exePath,
      session.startedAt,
      session.endedAt,
      session.durationSec,
      session.isIdleSegment ? 1 : 0,
      session.source
    );
  }

  async getSettings(): Promise<AppSettings> {
    const db = this.requireDb();
    const rows = await db.all<{ key: string; value_json: string }[]>(`SELECT key, value_json FROM settings`);
    const values = { ...DEFAULT_SETTINGS };

    for (const row of rows) {
      const parsed = JSON.parse(row.value_json);
      if (row.key === 'idleThresholdSeconds' && typeof parsed === 'number') {
        values.idleThresholdSeconds = Math.max(60, Math.min(1800, Math.floor(parsed)));
      }

      if (row.key === 'launchAtLogin' && typeof parsed === 'boolean') {
        values.launchAtLogin = parsed;
      }

      if (row.key === 'theme' && (parsed === 'light' || parsed === 'dark')) {
        values.theme = parsed;
      }
    }

    return values;
  }

  async updateSettings(next: Partial<AppSettings>): Promise<AppSettings> {
    const db = this.requireDb();
    const now = new Date().toISOString();

    if (typeof next.idleThresholdSeconds === 'number') {
      const idleThresholdSeconds = Math.max(60, Math.min(1800, Math.floor(next.idleThresholdSeconds)));
      await db.run(
        `
        INSERT INTO settings (key, value_json, updated_at)
        VALUES ('idleThresholdSeconds', ?, ?)
        ON CONFLICT(key) DO UPDATE SET value_json = excluded.value_json, updated_at = excluded.updated_at
        `,
        JSON.stringify(idleThresholdSeconds),
        now
      );
    }

    if (typeof next.launchAtLogin === 'boolean') {
      await db.run(
        `
        INSERT INTO settings (key, value_json, updated_at)
        VALUES ('launchAtLogin', ?, ?)
        ON CONFLICT(key) DO UPDATE SET value_json = excluded.value_json, updated_at = excluded.updated_at
        `,
        JSON.stringify(next.launchAtLogin),
        now
      );
    }

    if (next.theme === 'light' || next.theme === 'dark') {
      await db.run(
        `
        INSERT INTO settings (key, value_json, updated_at)
        VALUES ('theme', ?, ?)
        ON CONFLICT(key) DO UPDATE SET value_json = excluded.value_json, updated_at = excluded.updated_at
        `,
        JSON.stringify(next.theme),
        now
      );
    }

    return this.getSettings();
  }

  async getSummary(range: DateRange): Promise<SummaryStats> {
    const db = this.requireDb();

    const totals = await db.get<{
      totalActiveSeconds: number;
      totalIdleSeconds: number;
      totalTrackedSeconds: number;
    }>(
      `
      SELECT
        COALESCE(SUM(CASE WHEN is_idle_segment = 0 THEN duration_sec ELSE 0 END), 0) AS totalActiveSeconds,
        COALESCE(SUM(CASE WHEN is_idle_segment = 1 THEN duration_sec ELSE 0 END), 0) AS totalIdleSeconds,
        COALESCE(SUM(duration_sec), 0) AS totalTrackedSeconds
      FROM sessions
      WHERE started_at >= ? AND started_at <= ?
        AND source != 'background-process'
      `,
      range.from,
      range.to
    );

    const days = await db.all<{
      date: string;
      activeSeconds: number;
      idleSeconds: number;
    }[]>(
      `
      SELECT
        DATE(started_at, 'localtime') AS date,
        COALESCE(SUM(CASE WHEN is_idle_segment = 0 THEN duration_sec ELSE 0 END), 0) AS activeSeconds,
        COALESCE(SUM(CASE WHEN is_idle_segment = 1 THEN duration_sec ELSE 0 END), 0) AS idleSeconds
      FROM sessions
      WHERE started_at >= ? AND started_at <= ?
        AND source != 'background-process'
      GROUP BY DATE(started_at, 'localtime')
      ORDER BY date ASC
      `,
      range.from,
      range.to
    );

    return {
      totalActiveSeconds: totals?.totalActiveSeconds ?? 0,
      totalIdleSeconds: totals?.totalIdleSeconds ?? 0,
      totalTrackedSeconds: totals?.totalTrackedSeconds ?? 0,
      days
    };
  }

  async getTopApps(range: DateRange, limit: number): Promise<TopAppStat[]> {
    const db = this.requireDb();

    const rows = await db.all<{
      appName: string;
      exePath: string | null;
      activeSeconds: number;
    }[]>(
      `
      WITH filtered_sessions AS (
        SELECT app_name, exe_path, duration_sec
        FROM sessions
        WHERE started_at >= ?
          AND started_at <= ?
          AND is_idle_segment = 0
          AND source != 'background-process'
      ),
      durations AS (
        SELECT app_name AS appName, COALESCE(SUM(duration_sec), 0) AS activeSeconds
        FROM filtered_sessions
        GROUP BY app_name
      ),
      preferred_paths AS (
        SELECT
          app_name AS appName,
          exe_path AS exePath,
          ROW_NUMBER() OVER (
            PARTITION BY app_name
            ORDER BY
              CASE
                WHEN exe_path IS NULL OR TRIM(exe_path) = '' THEN 2
                WHEN INSTR(exe_path, '\\') > 0 OR INSTR(exe_path, '/') > 0 THEN 0
                ELSE 1
              END ASC,
              LENGTH(COALESCE(exe_path, '')) DESC
          ) AS pathRank
        FROM filtered_sessions
      )
      SELECT
        d.appName,
        p.exePath,
        d.activeSeconds
      FROM durations d
      LEFT JOIN preferred_paths p
        ON p.appName = d.appName
        AND p.pathRank = 1
      ORDER BY d.activeSeconds DESC
      LIMIT ?
      `,
      range.from,
      range.to,
      Math.max(1, limit)
    );

    return rows;
  }

  async getAIToolDailyStats(range: DateRange): Promise<AIToolDailyStat[]> {
    const db = this.requireDb();

    const rows = await db.all<{
      appName: string;
      exePath: string | null;
      startedAt: string;
      endedAt: string;
      durationSec: number;
      isIdleSegment: number;
      source: string;
    }[]>(
      `
      SELECT
        app_name AS appName,
        exe_path AS exePath,
        started_at AS startedAt,
        ended_at AS endedAt,
        duration_sec AS durationSec,
        is_idle_segment AS isIdleSegment,
        source
      FROM sessions
      WHERE started_at >= ?
        AND started_at <= ?
      ORDER BY started_at ASC
      `,
      range.from,
      range.to
    );

    const stats: Record<AIToolId, AIToolDailyStat> = {
      claude: { id: 'claude', activeSeconds: 0, sessionCount: 0 },
      codex: { id: 'codex', activeSeconds: 0, sessionCount: 0 }
    };

    const lastBackgroundSegmentEndMs: Record<AIToolId, number | null> = {
      claude: null,
      codex: null
    };

    for (const row of rows) {
      const toolId = resolveAIToolId(row.appName, row.exePath);
      if (!toolId) {
        continue;
      }

      // Only count foreground sessions for active time (not background-process)
      if (row.isIdleSegment === 0 && row.source !== 'background-process') {
        stats[toolId].activeSeconds += row.durationSec;
      }

      if (row.source !== 'background-process') {
        continue;
      }

      const startedAtMs = Date.parse(row.startedAt);
      if (!Number.isFinite(startedAtMs)) {
        continue;
      }

      const previousSegmentEndMs = lastBackgroundSegmentEndMs[toolId];
      if (previousSegmentEndMs === null || startedAtMs > previousSegmentEndMs + 1000) {
        stats[toolId].sessionCount += 1;
      }

      const endedAtMs = Date.parse(row.endedAt);
      lastBackgroundSegmentEndMs[toolId] = Number.isFinite(endedAtMs) ? endedAtMs : startedAtMs;
    }

    return AI_TOOLS.map((tool) => stats[tool.id]);
  }

  private async ensureDefaultSettings(): Promise<void> {
    const db = this.requireDb();
    const now = new Date().toISOString();

    await db.run(
      `
      INSERT OR IGNORE INTO settings (key, value_json, updated_at)
      VALUES ('idleThresholdSeconds', ?, ?)
      `,
      JSON.stringify(DEFAULT_SETTINGS.idleThresholdSeconds),
      now
    );

    await db.run(
      `
      INSERT OR IGNORE INTO settings (key, value_json, updated_at)
      VALUES ('launchAtLogin', ?, ?)
      `,
      JSON.stringify(DEFAULT_SETTINGS.launchAtLogin),
      now
    );

    await db.run(
      `
      INSERT OR IGNORE INTO settings (key, value_json, updated_at)
      VALUES ('theme', ?, ?)
      `,
      JSON.stringify(DEFAULT_SETTINGS.theme),
      now
    );
  }

  private requireDb(): Database {
    if (!this.db) {
      throw new Error('Database is not initialized');
    }

    return this.db;
  }
}
