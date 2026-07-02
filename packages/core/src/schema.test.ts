import Database from 'better-sqlite3';
import { beforeEach, describe, expect, it } from 'vitest';
import { SCHEMA_SQL, SQL, entryToRowParams, rowToEntry, type LogRow } from './schema';
import type { LogEntry } from './types';

// Runs the exact SQL the mobile driver executes, against a real SQLite.

let db: Database.Database;

function entry(id: string, day: string, kcal = 300): LogEntry {
  return {
    id,
    ts: Date.parse(`${day}T10:00:00`),
    day,
    tracker: 'meals',
    source: 'manual',
    data: { kind: 'meal', kcal },
  };
}

const allRows = () => db.prepare(SQL.selectAll).all() as LogRow[];

beforeEach(() => {
  db = new Database(':memory:');
  db.exec(SCHEMA_SQL);
});

describe('log_entries schema', () => {
  it('inserts a local entry into the outbox and round-trips it', () => {
    const e = entry('a', '2026-07-02');
    db.prepare(SQL.insert).run(...entryToRowParams(e, 1000));
    const rows = allRows();
    expect(rows).toHaveLength(1);
    expect(rows[0]!.synced_at).toBeNull();
    expect(rowToEntry(rows[0]!)).toEqual(e);
  });

  it('tombstone marks deleted, bumps updated_at, re-enters the outbox', () => {
    const e = entry('a', '2026-07-02');
    db.prepare(SQL.insert).run(...entryToRowParams(e, 1000));
    db.prepare(SQL.markSynced).run(2000, 'a');
    expect(db.prepare(SQL.selectPending).all()).toHaveLength(0);

    db.prepare(SQL.tombstone).run(3000, 'a');
    const pending = db.prepare(SQL.selectPending).all() as LogRow[];
    expect(pending).toHaveLength(1);
    expect(rowToEntry(pending[0]!).deleted).toBe(true);
  });

  it('upsertMerge applies only newer server rows (last write wins)', () => {
    const local = entry('a', '2026-07-02', 300);
    db.prepare(SQL.insert).run(...entryToRowParams(local, 5000));

    // Older server copy loses.
    const older = { ...entry('a', '2026-07-02', 111) };
    db.prepare(SQL.upsertMerge).run(...entryToRowParams(older, 4000), 4000);
    expect(rowToEntry(allRows()[0]!).data).toEqual({ kind: 'meal', kcal: 300 });

    // Newer server copy wins and arrives already synced.
    const newer = { ...entry('a', '2026-07-02', 222) };
    db.prepare(SQL.upsertMerge).run(...entryToRowParams(newer, 6000), 6000);
    const row = allRows()[0]!;
    expect(rowToEntry(row).data).toEqual({ kind: 'meal', kcal: 222 });
    expect(row.synced_at).toBe(6000);

    // Unknown ids insert.
    db.prepare(SQL.upsertMerge).run(...entryToRowParams(entry('b', '2026-07-01'), 7000), 7000);
    expect(allRows()).toHaveLength(2);
  });

  it('selectPending returns unsynced and re-modified rows in order', () => {
    db.prepare(SQL.insert).run(...entryToRowParams(entry('a', '2026-07-01'), 1000));
    db.prepare(SQL.insert).run(...entryToRowParams(entry('b', '2026-07-02'), 2000));
    db.prepare(SQL.markSynced).run(2500, 'a');
    const pending = db.prepare(SQL.selectPending).all() as LogRow[];
    expect(pending.map((r) => r.id)).toEqual(['b']);
  });
});

describe('kv schema', () => {
  it('set, get, overwrite, delete', () => {
    db.prepare(SQL.kvSet).run('streka-settings', '{"a":1}', 1000);
    db.prepare(SQL.kvSet).run('streka-settings', '{"a":2}', 2000);
    const row = db.prepare(SQL.kvGet).get('streka-settings') as { value: string };
    expect(row.value).toBe('{"a":2}');
    db.prepare(SQL.kvDelete).run('streka-settings');
    expect(db.prepare(SQL.kvGet).get('streka-settings')).toBeUndefined();
  });
});
