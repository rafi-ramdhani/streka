import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { StateStorage } from 'zustand/middleware';
import { createCore } from './store';

function memoryStorage(): StateStorage {
  const m = new Map<string, string>();
  return {
    getItem: (k) => m.get(k) ?? null,
    setItem: (k, v) => void m.set(k, v),
    removeItem: (k) => void m.delete(k),
  };
}

const NOW = new Date(2026, 6, 2, 9, 0).getTime(); // 2026-07-02 local

function makeCore() {
  let seq = 0;
  return createCore({
    storage: memoryStorage(),
    now: () => NOW,
    id: () => `uuid-${++seq}`,
  });
}

beforeEach(() => vi.useFakeTimers());
afterEach(() => vi.useRealTimers());

describe('logActivity', () => {
  it('appends an entry with generated id and local day', () => {
    const core = makeCore();
    core.logActivity({
      tracker: 'meals',
      source: 'manual',
      data: { kind: 'meal', kcal: 300 },
      title: 'Meal logged · 300 kcal',
    });
    const e = core.useLogs.getState().entries[0]!;
    expect(e.id).toBe('uuid-1');
    expect(e.day).toBe('2026-07-02');
    expect(e.ts).toBe(NOW);
  });

  it('first log of day for a fresh local user starts the streak', () => {
    const core = makeCore();
    core.logActivity({
      tracker: 'meals',
      source: 'manual',
      data: { kind: 'meal', kcal: 300 },
      title: 'Meal logged · 300 kcal',
    });
    expect(core.useToast.getState().toast).toEqual({
      title: 'Meal logged · 300 kcal',
      sub: 'Streak started — day 1 · on this phone',
    });
  });

  it('second log the same day is not a streak toast', () => {
    const core = makeCore();
    const log = () =>
      core.logActivity({
        tracker: 'meals',
        source: 'manual',
        data: { kind: 'meal', kcal: 300 },
        title: 'Meal logged · 300 kcal',
      });
    log();
    log();
    expect(core.useToast.getState().toast?.sub).toBe('Saved on this phone');
  });

  it('account + offline wording', () => {
    const core = makeCore();
    core.useSettings.getState().set({ hasAccount: true });
    core.useSync.getState().setOnline(false);
    core.logActivity({
      tracker: 'running',
      source: 'gps',
      data: { kind: 'run', km: 4.2 },
      title: 'Run logged · 4.2 km',
    });
    expect(core.useToast.getState().toast?.sub).toBe('Streak started — day 1 · will sync');
    core.logActivity({
      tracker: 'meals',
      source: 'manual',
      data: { kind: 'meal', kcal: 550 },
      title: 'Meal logged · 550 kcal',
    });
    expect(core.useToast.getState().toast?.sub).toBe('Saved — will sync when online');
  });

  it('toast auto-clears after 2800 ms', () => {
    const core = makeCore();
    core.showToast('Hello', 'world');
    expect(core.useToast.getState().toast).not.toBeNull();
    vi.advanceTimersByTime(2799);
    expect(core.useToast.getState().toast).not.toBeNull();
    vi.advanceTimersByTime(1);
    expect(core.useToast.getState().toast).toBeNull();
  });

  it('tombstone marks an entry deleted without removing it', () => {
    const core = makeCore();
    core.logActivity({
      tracker: 'running',
      source: 'gps',
      data: { kind: 'run', km: 4.2 },
      title: 'Run logged · 4.2 km',
    });
    core.useLogs.getState().tombstone('uuid-1');
    expect(core.useLogs.getState().entries[0]!.deleted).toBe(true);
    expect(core.useLogs.getState().entries).toHaveLength(1);
  });
});
