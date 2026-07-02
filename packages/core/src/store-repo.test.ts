import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { StateStorage } from 'zustand/middleware';
import type { LogRepo } from './repo';
import type { LogEntry } from './types';
import { createCore } from './store';

function memoryStorage(): StateStorage {
  const m = new Map<string, string>();
  return {
    getItem: (k) => m.get(k) ?? null,
    setItem: (k, v) => void m.set(k, v),
    removeItem: (k) => void m.delete(k),
  };
}

// In-memory LogRepo faking the SQLite driver.
function fakeRepo(seed: LogEntry[] = []) {
  const rows = new Map<string, { entry: LogEntry; updatedAt: number; syncedAt: number | null }>();
  seed.forEach((e, i) => rows.set(e.id, { entry: e, updatedAt: i, syncedAt: i }));
  const repo: LogRepo = {
    init: async () => {},
    all: async () => [...rows.values()].map((r) => r.entry),
    insert: async (entry, updatedAt) => void rows.set(entry.id, { entry, updatedAt, syncedAt: null }),
    tombstone: async (id, updatedAt) => {
      const r = rows.get(id);
      if (r) rows.set(id, { entry: { ...r.entry, deleted: true }, updatedAt, syncedAt: r.syncedAt });
    },
    replaceAll: async (entries, updatedAt) => {
      rows.clear();
      entries.forEach((e) => rows.set(e.id, { entry: e, updatedAt, syncedAt: null }));
    },
    pending: async () =>
      [...rows.values()]
        .filter((r) => r.syncedAt === null || r.updatedAt > r.syncedAt)
        .map((r) => r.entry),
    markSynced: async (ids, syncedAt) => {
      for (const id of ids) {
        const r = rows.get(id);
        if (r) r.syncedAt = syncedAt;
      }
    },
  };
  return { repo, rows };
}

const NOW = new Date(2026, 6, 2, 9, 0).getTime();

function makeCore(repo: LogRepo) {
  let seq = 0;
  return createCore({
    storage: memoryStorage(),
    now: () => NOW,
    id: () => `uuid-${++seq}`,
    logRepo: repo,
  });
}

beforeEach(() => vi.useRealTimers());

describe('store with LogRepo', () => {
  it('starts unhydrated, hydrates from the repo', async () => {
    const seeded: LogEntry = {
      id: 'seed-1',
      ts: NOW - 86_400_000,
      day: '2026-07-01',
      tracker: 'meals',
      source: 'manual',
      data: { kind: 'meal', kcal: 550 },
    };
    const { repo } = fakeRepo([seeded]);
    const core = makeCore(repo);
    expect(core.useLogs.getState().hydrated).toBe(false);
    await core.hydrate();
    expect(core.useLogs.getState().hydrated).toBe(true);
    expect(core.useLogs.getState().entries).toEqual([seeded]);
  });

  it('append writes through to the repo outbox', async () => {
    const { repo, rows } = fakeRepo();
    const core = makeCore(repo);
    await core.hydrate();
    core.logActivity({
      tracker: 'meals',
      source: 'manual',
      data: { kind: 'meal', kcal: 300 },
      title: 'Meal logged · 300 kcal',
    });
    await vi.waitFor(() => expect(rows.has('uuid-1')).toBe(true));
    expect((await repo.pending()).map((e) => e.id)).toEqual(['uuid-1']);
  });

  it('tombstone writes through', async () => {
    const { repo, rows } = fakeRepo();
    const core = makeCore(repo);
    await core.hydrate();
    core.logActivity({
      tracker: 'running',
      source: 'gps',
      data: { kind: 'run', km: 4.2 },
      title: 'Run logged',
    });
    core.useLogs.getState().tombstone('uuid-1');
    await vi.waitFor(() => expect(rows.get('uuid-1')!.entry.deleted).toBe(true));
    expect(core.useLogs.getState().entries[0]!.deleted).toBe(true);
  });

  it('replaceAll resets both store and repo', async () => {
    const { repo, rows } = fakeRepo();
    const core = makeCore(repo);
    await core.hydrate();
    const demo: LogEntry = {
      id: 'demo-1',
      ts: NOW,
      day: '2026-07-02',
      tracker: 'swimming',
      source: 'manual',
      data: { kind: 'swim', m: 800 },
    };
    core.useLogs.getState().replaceAll([demo]);
    await vi.waitFor(() => expect(rows.size).toBe(1));
    expect(core.useLogs.getState().entries).toEqual([demo]);
  });

  it('without a repo, hydrate resolves and marks hydrated', async () => {
    const core = createCore({ storage: memoryStorage() });
    await core.hydrate();
    expect(core.useLogs.getState().hydrated).toBe(true);
  });
});
