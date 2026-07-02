import type { LogEntry } from './types';

// Persistence seam for log entries. The mobile app implements this over
// expo-sqlite using the statements in schema.ts; tests use better-sqlite3
// against the identical SQL. The web app currently runs without a repo
// (zustand persist), which the store factory supports.
export interface LogRepo {
  init: () => Promise<void>;
  all: () => Promise<LogEntry[]>;
  insert: (entry: LogEntry, updatedAt: number) => Promise<void>;
  tombstone: (id: string, updatedAt: number) => Promise<void>;
  replaceAll: (entries: LogEntry[], updatedAt: number) => Promise<void>;
  // Outbox for the deferred sync backend: rows never uploaded, or changed
  // since the last upload.
  pending: () => Promise<LogEntry[]>;
  markSynced: (ids: string[], syncedAt: number) => Promise<void>;
}
