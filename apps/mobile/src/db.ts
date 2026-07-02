import * as SQLite from 'expo-sqlite';
import {
  SCHEMA_SQL,
  SQL,
  entryToRowParams,
  rowToEntry,
  type LogEntry,
  type LogRepo,
  type LogRow,
} from '@streka/core';
import type { StateStorage } from 'zustand/middleware';

// One SQLite database holds everything durable: the log_entries event table
// (sync-ready, see core schema.ts) and the kv table backing settings. The
// schema statements are shared with core and covered by node tests there.

const dbPromise = (async () => {
  const db = await SQLite.openDatabaseAsync('streka.db');
  await db.execAsync(SCHEMA_SQL);
  return db;
})();

export const sqliteLogRepo: LogRepo = {
  init: async () => {
    await dbPromise;
  },
  all: async () => {
    const db = await dbPromise;
    const rows = await db.getAllAsync<LogRow>(SQL.selectAll);
    return rows.map(rowToEntry);
  },
  insert: async (entry: LogEntry, updatedAt: number) => {
    const db = await dbPromise;
    await db.runAsync(SQL.insert, entryToRowParams(entry, updatedAt) as SQLite.SQLiteBindParams);
  },
  tombstone: async (id: string, updatedAt: number) => {
    const db = await dbPromise;
    await db.runAsync(SQL.tombstone, [updatedAt, id]);
  },
  replaceAll: async (entries: LogEntry[], updatedAt: number) => {
    const db = await dbPromise;
    await db.withTransactionAsync(async () => {
      await db.runAsync(SQL.deleteAll);
      for (const e of entries) {
        await db.runAsync(SQL.insert, entryToRowParams(e, updatedAt) as SQLite.SQLiteBindParams);
      }
    });
  },
  pending: async () => {
    const db = await dbPromise;
    const rows = await db.getAllAsync<LogRow>(SQL.selectPending);
    return rows.map(rowToEntry);
  },
  markSynced: async (ids: string[], syncedAt: number) => {
    const db = await dbPromise;
    await db.withTransactionAsync(async () => {
      for (const id of ids) await db.runAsync(SQL.markSynced, [syncedAt, id]);
    });
  },
};

// zustand persist storage for settings, backed by the kv table.
export const kvStorage: StateStorage = {
  getItem: async (key) => {
    const db = await dbPromise;
    const row = await db.getFirstAsync<{ value: string }>(SQL.kvGet, [key]);
    return row?.value ?? null;
  },
  setItem: async (key, value) => {
    const db = await dbPromise;
    await db.runAsync(SQL.kvSet, [key, value, Date.now()]);
  },
  removeItem: async (key) => {
    const db = await dbPromise;
    await db.runAsync(SQL.kvDelete, [key]);
  },
};
