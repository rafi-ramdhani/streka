import type { LogData, LogEntry, LogSource, TrackerId } from './types';

// Local database schema, designed to mirror the future server tables so sync
// is a straight replication problem (product rule 5):
// - log_entries is append-only; rows are keyed by the client-generated UUID.
// - deleted is a tombstone, never a row removal.
// - updated_at drives last-write-wins merges in both directions.
// - synced_at is local-only bookkeeping: NULL or older than updated_at means
//   the row is in the outbox awaiting upload. A server would not have it.
// - kv holds settings as per-key LWW values.

export const SCHEMA_VERSION = 1;

export const SCHEMA_SQL = `
CREATE TABLE IF NOT EXISTS log_entries (
  id TEXT PRIMARY KEY,
  ts INTEGER NOT NULL,
  day TEXT NOT NULL,
  tracker TEXT NOT NULL,
  source TEXT NOT NULL,
  kind TEXT NOT NULL,
  payload TEXT NOT NULL,
  deleted INTEGER NOT NULL DEFAULT 0,
  updated_at INTEGER NOT NULL,
  synced_at INTEGER
);
CREATE INDEX IF NOT EXISTS idx_log_entries_day ON log_entries(day);
CREATE INDEX IF NOT EXISTS idx_log_entries_pending
  ON log_entries(updated_at) WHERE synced_at IS NULL;
CREATE TABLE IF NOT EXISTS kv (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  updated_at INTEGER NOT NULL
);
`;

export const SQL = {
  selectAll: 'SELECT * FROM log_entries ORDER BY ts',
  // Local insert of a brand-new event.
  insert: `INSERT INTO log_entries (id, ts, day, tracker, source, kind, payload, deleted, updated_at, synced_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NULL)`,
  // Merge upsert for rows arriving from the server: last write wins on
  // updated_at; incoming rows are already synced.
  upsertMerge: `INSERT INTO log_entries (id, ts, day, tracker, source, kind, payload, deleted, updated_at, synced_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                ON CONFLICT(id) DO UPDATE SET
                  ts = excluded.ts,
                  day = excluded.day,
                  tracker = excluded.tracker,
                  source = excluded.source,
                  kind = excluded.kind,
                  payload = excluded.payload,
                  deleted = excluded.deleted,
                  updated_at = excluded.updated_at,
                  synced_at = excluded.synced_at
                WHERE excluded.updated_at > log_entries.updated_at`,
  tombstone: 'UPDATE log_entries SET deleted = 1, updated_at = ? WHERE id = ?',
  deleteAll: 'DELETE FROM log_entries',
  selectPending:
    'SELECT * FROM log_entries WHERE synced_at IS NULL OR updated_at > synced_at ORDER BY updated_at',
  markSynced: 'UPDATE log_entries SET synced_at = ? WHERE id = ?',
  kvGet: 'SELECT value FROM kv WHERE key = ?',
  kvSet: `INSERT INTO kv (key, value, updated_at) VALUES (?, ?, ?)
          ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at`,
  kvDelete: 'DELETE FROM kv WHERE key = ?',
} as const;

export interface LogRow {
  id: string;
  ts: number;
  day: string;
  tracker: string;
  source: string;
  kind: string;
  payload: string;
  deleted: number;
  updated_at: number;
  synced_at: number | null;
}

export function entryToRowParams(entry: LogEntry, updatedAt: number): unknown[] {
  return [
    entry.id,
    entry.ts,
    entry.day,
    entry.tracker,
    entry.source,
    entry.data.kind,
    JSON.stringify(entry.data),
    entry.deleted ? 1 : 0,
    updatedAt,
  ];
}

export function rowToEntry(row: LogRow): LogEntry {
  return {
    id: row.id,
    ts: row.ts,
    day: row.day,
    tracker: row.tracker as TrackerId,
    source: row.source as LogSource,
    data: JSON.parse(row.payload) as LogData,
    ...(row.deleted ? { deleted: true } : {}),
  };
}
