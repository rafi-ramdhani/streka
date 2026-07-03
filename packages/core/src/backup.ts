import type { LogEntry } from './types';

// Local backup file (product rule 5, offline-first): a plain JSON snapshot of
// every log_entries row, tombstones included, keyed by their client UUIDs and
// original timestamps. Because ids and timestamps are preserved, a restore
// reproduces the exact history and stays merge-safe if account sync ever lands.
// Import replaces the local store wholesale, so the file is a true backup, not
// a merge.

export interface Backup {
  app: 'streka';
  version: 1;
  exportedAt: number;
  entries: LogEntry[];
}

export const BACKUP_VERSION = 1;

// Thrown for any malformed or foreign file, with a message safe to show.
export class BackupError extends Error {}

export function serializeBackup(entries: LogEntry[], exportedAt: number): string {
  const backup: Backup = { app: 'streka', version: BACKUP_VERSION, exportedAt, entries };
  return JSON.stringify(backup, null, 2);
}

function isEntry(value: unknown): value is LogEntry {
  if (typeof value !== 'object' || value === null) return false;
  const e = value as Record<string, unknown>;
  if (typeof e.id !== 'string' || e.id === '') return false;
  if (typeof e.ts !== 'number' || !Number.isFinite(e.ts)) return false;
  if (typeof e.day !== 'string') return false;
  if (typeof e.tracker !== 'string') return false;
  if (typeof e.source !== 'string') return false;
  if (typeof e.data !== 'object' || e.data === null) return false;
  if (typeof (e.data as Record<string, unknown>).kind !== 'string') return false;
  if ('deleted' in e && typeof e.deleted !== 'boolean') return false;
  return true;
}

// Parse a backup file's text into entries, or throw BackupError with a message
// fit for a toast. Never returns partial data: one bad row rejects the file.
export function parseBackup(text: string): LogEntry[] {
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    throw new BackupError('That file is not valid JSON.');
  }
  if (typeof raw !== 'object' || raw === null) throw new BackupError('That is not a Streka backup.');
  const obj = raw as Record<string, unknown>;
  if (obj.app !== 'streka' || !Array.isArray(obj.entries)) {
    throw new BackupError('That is not a Streka backup.');
  }
  const entries: LogEntry[] = [];
  for (const item of obj.entries) {
    if (!isEntry(item)) throw new BackupError('This backup is missing or corrupted data.');
    entries.push(item);
  }
  return entries;
}
