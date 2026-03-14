import path from 'node:path';
import { promises as fs } from 'node:fs';
import { Database, open } from 'sqlite';
import sqlite3 from 'sqlite3';
import type { AIToolDailyStat, AppLimit, AppLimitStatus, AppSettings, DateRange, FocusSchedule, FocusSessionRecord, SessionInput, SummaryStats, TopAppStat } from '../../shared/types';

const DEFAULT_SETTINGS: AppSettings = {
  idleThresholdSeconds: 300,
  launchAtLogin: true,
  theme: 'light',
  dailyGoalHours: 8,
  minimizeToTray: true,
  dailyGoalNotification: true,
  autoCheckUpdates: true,
  breakReminderEnabled: true,
  breakReminderIntervalMinutes: 90
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

const UPSERT_SETTING_SQL = `
  INSERT INTO settings (key, value_json, updated_at)
  VALUES (?, ?, ?)
  ON CONFLICT(key) DO UPDATE SET value_json = excluded.value_json, updated_at = excluded.updated_at
  `;

type SettingsEntry = {
  key: keyof AppSettings;
  value: AppSettings[keyof AppSettings];
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

      CREATE TABLE IF NOT EXISTS app_limits (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        app_name TEXT NOT NULL,
        exe_path TEXT,
        daily_limit_seconds INTEGER NOT NULL CHECK(daily_limit_seconds > 0),
        enabled INTEGER NOT NULL DEFAULT 1,
        created_at TEXT NOT NULL,
        UNIQUE(app_name)
      );

      CREATE TABLE IF NOT EXISTS focus_sessions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        started_at TEXT NOT NULL,
        ended_at TEXT,
        planned_duration_sec INTEGER NOT NULL,
        actual_duration_sec INTEGER,
        completed INTEGER NOT NULL DEFAULT 0,
        label TEXT
      );

      CREATE TABLE IF NOT EXISTS focus_schedules (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        label TEXT NOT NULL,
        days_of_week TEXT NOT NULL,
        start_time TEXT NOT NULL,
        end_time TEXT NOT NULL,
        enabled INTEGER NOT NULL DEFAULT 1,
        created_at TEXT NOT NULL
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

      if (row.key === 'dailyGoalHours' && typeof parsed === 'number') {
        values.dailyGoalHours = Math.max(1, Math.min(24, Math.floor(parsed)));
      }

      if (row.key === 'minimizeToTray' && typeof parsed === 'boolean') {
        values.minimizeToTray = parsed;
      }

      if (row.key === 'dailyGoalNotification' && typeof parsed === 'boolean') {
        values.dailyGoalNotification = parsed;
      }

      if (row.key === 'autoCheckUpdates' && typeof parsed === 'boolean') {
        values.autoCheckUpdates = parsed;
      }

      if (row.key === 'breakReminderEnabled' && typeof parsed === 'boolean') {
        values.breakReminderEnabled = parsed;
      }

      if (row.key === 'breakReminderIntervalMinutes' && typeof parsed === 'number') {
        values.breakReminderIntervalMinutes = Math.max(5, Math.min(480, Math.floor(parsed)));
      }
    }

    return values;
  }

  async updateSettings(next: Partial<AppSettings>): Promise<AppSettings> {
    const db = this.requireDb();
    const now = new Date().toISOString();
    const entries: SettingsEntry[] = [];

    if (typeof next.idleThresholdSeconds === 'number') {
      entries.push({
        key: 'idleThresholdSeconds',
        value: Math.max(60, Math.min(1800, Math.floor(next.idleThresholdSeconds)))
      });
    }

    if (typeof next.launchAtLogin === 'boolean') {
      entries.push({ key: 'launchAtLogin', value: next.launchAtLogin });
    }

    if (next.theme === 'light' || next.theme === 'dark') {
      entries.push({ key: 'theme', value: next.theme });
    }

    if (typeof next.dailyGoalHours === 'number') {
      entries.push({
        key: 'dailyGoalHours',
        value: Math.max(1, Math.min(24, Math.floor(next.dailyGoalHours)))
      });
    }

    if (typeof next.minimizeToTray === 'boolean') {
      entries.push({ key: 'minimizeToTray', value: next.minimizeToTray });
    }

    if (typeof next.dailyGoalNotification === 'boolean') {
      entries.push({ key: 'dailyGoalNotification', value: next.dailyGoalNotification });
    }

    if (typeof next.autoCheckUpdates === 'boolean') {
      entries.push({ key: 'autoCheckUpdates', value: next.autoCheckUpdates });
    }

    if (typeof next.breakReminderEnabled === 'boolean') {
      entries.push({ key: 'breakReminderEnabled', value: next.breakReminderEnabled });
    }

    if (typeof next.breakReminderIntervalMinutes === 'number') {
      entries.push({
        key: 'breakReminderIntervalMinutes',
        value: Math.max(5, Math.min(480, Math.floor(next.breakReminderIntervalMinutes)))
      });
    }

    if (entries.length === 0) {
      return this.getSettings();
    }

    await db.exec('BEGIN IMMEDIATE TRANSACTION');

    try {
      for (const entry of entries) {
        await db.run(UPSERT_SETTING_SQL, entry.key, JSON.stringify(entry.value), now);
      }

      await db.exec('COMMIT');
    } catch (error) {
      await db.exec('ROLLBACK');
      throw error;
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

  // --- App Limits ---

  async getAppLimits(): Promise<AppLimit[]> {
    const db = this.requireDb();
    const rows = await db.all<{
      id: number; app_name: string; exe_path: string | null;
      daily_limit_seconds: number; enabled: number; created_at: string;
    }[]>(`SELECT * FROM app_limits ORDER BY app_name`);
    return rows.map((r) => ({
      id: r.id, appName: r.app_name, exePath: r.exe_path,
      dailyLimitSeconds: r.daily_limit_seconds, enabled: r.enabled === 1,
      createdAt: r.created_at
    }));
  }

  async upsertAppLimit(limit: { appName: string; exePath: string | null; dailyLimitSeconds: number; enabled: boolean }): Promise<void> {
    const db = this.requireDb();
    await db.run(
      `INSERT INTO app_limits (app_name, exe_path, daily_limit_seconds, enabled, created_at)
       VALUES (?, ?, ?, ?, ?)
       ON CONFLICT(app_name) DO UPDATE SET exe_path = excluded.exe_path, daily_limit_seconds = excluded.daily_limit_seconds, enabled = excluded.enabled`,
      limit.appName, limit.exePath, limit.dailyLimitSeconds, limit.enabled ? 1 : 0, new Date().toISOString()
    );
  }

  async removeAppLimit(id: number): Promise<void> {
    const db = this.requireDb();
    await db.run(`DELETE FROM app_limits WHERE id = ?`, id);
  }

  async getAppUsageToday(appName: string): Promise<number> {
    const db = this.requireDb();
    const now = new Date();
    const from = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
    const to = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999).toISOString();
    const row = await db.get<{ total: number }>(
      `SELECT COALESCE(SUM(duration_sec), 0) AS total FROM sessions
       WHERE app_name = ? AND started_at >= ? AND started_at <= ? AND is_idle_segment = 0 AND source != 'background-process'`,
      appName, from, to
    );
    return row?.total ?? 0;
  }

  // --- Focus Sessions ---

  async insertFocusSession(session: { startedAt: string; plannedDurationSec: number; label: string | null }): Promise<number> {
    const db = this.requireDb();
    const result = await db.run(
      `INSERT INTO focus_sessions (started_at, planned_duration_sec, label) VALUES (?, ?, ?)`,
      session.startedAt, session.plannedDurationSec, session.label
    );
    return result.lastID!;
  }

  async updateFocusSession(id: number, update: { endedAt: string; actualDurationSec: number; completed: boolean }): Promise<void> {
    const db = this.requireDb();
    await db.run(
      `UPDATE focus_sessions SET ended_at = ?, actual_duration_sec = ?, completed = ? WHERE id = ?`,
      update.endedAt, update.actualDurationSec, update.completed ? 1 : 0, id
    );
  }

  async getTodayFocusSessionCount(): Promise<number> {
    const db = this.requireDb();
    const now = new Date();
    const from = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
    const to = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999).toISOString();
    const row = await db.get<{ count: number }>(
      `SELECT COUNT(*) AS count FROM focus_sessions WHERE started_at >= ? AND started_at <= ? AND completed = 1`,
      from, to
    );
    return row?.count ?? 0;
  }

  // --- Focus Schedules ---

  async getFocusSchedules(): Promise<FocusSchedule[]> {
    const db = this.requireDb();
    const rows = await db.all<{
      id: number; label: string; days_of_week: string;
      start_time: string; end_time: string; enabled: number; created_at: string;
    }[]>(`SELECT * FROM focus_schedules ORDER BY start_time`);
    return rows.map((r) => ({
      id: r.id, label: r.label, daysOfWeek: r.days_of_week,
      startTime: r.start_time, endTime: r.end_time, enabled: r.enabled === 1,
      createdAt: r.created_at
    }));
  }

  async createFocusSchedule(schedule: { label: string; daysOfWeek: string; startTime: string; endTime: string; enabled: boolean }): Promise<void> {
    const db = this.requireDb();
    await db.run(
      `INSERT INTO focus_schedules (label, days_of_week, start_time, end_time, enabled, created_at) VALUES (?, ?, ?, ?, ?, ?)`,
      schedule.label, schedule.daysOfWeek, schedule.startTime, schedule.endTime, schedule.enabled ? 1 : 0, new Date().toISOString()
    );
  }

  async updateFocusSchedule(schedule: FocusSchedule): Promise<void> {
    const db = this.requireDb();
    await db.run(
      `UPDATE focus_schedules SET label = ?, days_of_week = ?, start_time = ?, end_time = ?, enabled = ? WHERE id = ?`,
      schedule.label, schedule.daysOfWeek, schedule.startTime, schedule.endTime, schedule.enabled ? 1 : 0, schedule.id
    );
  }

  async removeFocusSchedule(id: number): Promise<void> {
    const db = this.requireDb();
    await db.run(`DELETE FROM focus_schedules WHERE id = ?`, id);
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

    await db.run(
      `
      INSERT OR IGNORE INTO settings (key, value_json, updated_at)
      VALUES ('dailyGoalHours', ?, ?)
      `,
      JSON.stringify(DEFAULT_SETTINGS.dailyGoalHours),
      now
    );

    await db.run(
      `
      INSERT OR IGNORE INTO settings (key, value_json, updated_at)
      VALUES ('minimizeToTray', ?, ?)
      `,
      JSON.stringify(DEFAULT_SETTINGS.minimizeToTray),
      now
    );

    await db.run(
      `
      INSERT OR IGNORE INTO settings (key, value_json, updated_at)
      VALUES ('dailyGoalNotification', ?, ?)
      `,
      JSON.stringify(DEFAULT_SETTINGS.dailyGoalNotification),
      now
    );

    await db.run(
      `
      INSERT OR IGNORE INTO settings (key, value_json, updated_at)
      VALUES ('autoCheckUpdates', ?, ?)
      `,
      JSON.stringify(DEFAULT_SETTINGS.autoCheckUpdates),
      now
    );

    await db.run(
      `
      INSERT OR IGNORE INTO settings (key, value_json, updated_at)
      VALUES ('breakReminderEnabled', ?, ?)
      `,
      JSON.stringify(DEFAULT_SETTINGS.breakReminderEnabled),
      now
    );

    await db.run(
      `
      INSERT OR IGNORE INTO settings (key, value_json, updated_at)
      VALUES ('breakReminderIntervalMinutes', ?, ?)
      `,
      JSON.stringify(DEFAULT_SETTINGS.breakReminderIntervalMinutes),
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

