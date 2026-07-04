import type { LogData, LogEntry, LogSource, Settings, TrackerId } from '@streka/core';
import { DEFAULT_SETTINGS } from '@streka/core';
import { core } from './core';

const { useLogs, useSettings } = core;

export interface WireEntry {
  id: string;
  ts: number;
  day: string;
  tracker: string;
  source: string;
  kind: string;
  payload: unknown;
  deleted: boolean;
  updatedAt: number;
}

interface WireSetting {
  key: string;
  value: unknown;
  updatedAt: number;
}

interface SyncResult {
  cursor: number;
  entries: WireEntry[];
  settings: WireSetting[];
  hasMore: boolean;
}

interface SyncRequestBody {
  cursor: number;
  entries: WireEntry[];
  settings: WireSetting[];
}

// Session-scoped pull cursor. pullAll() resets it to 0 for a clean full
// snapshot on each mount; pushes advance it from the server's response.
let cursor = 0;

export function toWire(entry: LogEntry): WireEntry {
  return {
    id: entry.id,
    ts: entry.ts,
    day: entry.day,
    tracker: entry.tracker,
    source: entry.source,
    kind: entry.data.kind,
    payload: entry.data,
    deleted: entry.deleted ?? false,
    updatedAt: Date.now(),
  };
}

export function fromWire(w: WireEntry): LogEntry {
  return {
    id: w.id,
    ts: w.ts,
    day: w.day,
    tracker: w.tracker as TrackerId,
    source: w.source as LogSource,
    data: w.payload as LogData,
    deleted: w.deleted,
  };
}

async function postSync(body: SyncRequestBody): Promise<SyncResult> {
  const res = await fetch('/api/sync', {
    method: 'POST',
    credentials: 'same-origin',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`sync failed: ${res.status}`);
  return (await res.json()) as SyncResult;
}

function applySyncResult(result: SyncResult): void {
  if (result.entries.length > 0) {
    const byId = new Map(useLogs.getState().entries.map((e) => [e.id, e]));
    for (const w of result.entries) byId.set(w.id, fromWire(w));
    useLogs.getState().replaceAll([...byId.values()]);
  }
  const row = result.settings.find((s) => s.key === 'settings');
  if (row) useSettings.getState().set(row.value as Partial<Settings>);
  cursor = result.cursor;
}

// Full snapshot from cursor 0 on every mount. Clearing first guarantees a
// previous account's data cannot linger in a shared-browser session.
export async function pullAll(): Promise<void> {
  cursor = 0;
  useLogs.getState().replaceAll([]);
  // Reset settings to defaults too, so a prior account's settings do not
  // linger on a shared-browser SPA account switch when the new account has
  // no server settings row to overlay them.
  useSettings.getState().set(DEFAULT_SETTINGS);
  let more = true;
  while (more) {
    const result = await postSync({ cursor, entries: [], settings: [] });
    applySyncResult(result);
    more = result.hasMore;
  }
}

export async function pushEntry(entry: LogEntry): Promise<void> {
  const result = await postSync({ cursor, entries: [toWire(entry)], settings: [] });
  applySyncResult(result);
}

export async function pushSettings(settings: Settings): Promise<void> {
  const result = await postSync({
    cursor,
    entries: [],
    settings: [{ key: 'settings', value: settings, updatedAt: Date.now() }],
  });
  applySyncResult(result);
}
