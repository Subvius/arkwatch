import path from 'node:path';
import { promises as fs } from 'node:fs';
import { Database, open } from 'sqlite';
import sqlite3 from 'sqlite3';
import type { AppSettings, DateRange, SessionInput, SummaryStats, TopAppStat } from '../../shared/types';

const DEFAULT_SETTINGS: AppSettings = {
  idleThresholdSeconds: 300,
  launchAtLogin: true
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
      SELECT
        app_name AS appName,
        MAX(exe_path) AS exePath,
        COALESCE(SUM(duration_sec), 0) AS activeSeconds
      FROM sessions
      WHERE started_at >= ?
        AND started_at <= ?
        AND is_idle_segment = 0
      GROUP BY app_name
      ORDER BY activeSeconds DESC
      LIMIT ?
      `,
      range.from,
      range.to,
      Math.max(1, limit)
    );

    return rows;
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
  }

  private requireDb(): Database {
    if (!this.db) {
      throw new Error('Database is not initialized');
    }

    return this.db;
  }
}
