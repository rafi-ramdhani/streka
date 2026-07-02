import { createCore, createMockScan } from '@streka/core';
import { kvStorage, sqliteLogRepo } from './db';

// All durable state lives in one SQLite database (src/db.ts): log entries in
// the sync-ready event table, settings in the kv table.
export const core = createCore({
  storage: kvStorage,
  logRepo: sqliteLogRepo,
});

export const { useSettings, useLogs, useSync, useToast, showToast, logActivity } = core;

export const scanService = createMockScan();
