import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { core } from './core';
import { pullAll, pushEntry, pushSettings, toWire } from './sync';

function wireMeal(id: string, kcal: number) {
  return {
    id,
    ts: 1,
    day: '2026-07-04',
    tracker: 'meals',
    source: 'manual',
    kind: 'meal',
    payload: { kind: 'meal', kcal },
    deleted: false,
    updatedAt: 1,
  };
}

function ok(body: unknown) {
  return { ok: true, json: async () => body };
}

function lastBody(mock: ReturnType<typeof vi.fn>) {
  const call = mock.mock.calls[mock.mock.calls.length - 1]!;
  return JSON.parse(call[1].body);
}

beforeEach(() => {
  core.useLogs.setState({ entries: [] });
});
afterEach(() => {
  vi.unstubAllGlobals();
});

describe('sync engine', () => {
  it('pullAll posts cursor 0 with empty batches and hydrates the store', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(ok({ cursor: 3, entries: [wireMeal('a', 550)], settings: [], hasMore: false }));
    vi.stubGlobal('fetch', fetchMock);

    await pullAll();

    expect(fetchMock).toHaveBeenCalledWith('/api/sync', expect.objectContaining({ method: 'POST' }));
    const body = JSON.parse(fetchMock.mock.calls[0]![1].body);
    expect(body).toEqual({ cursor: 0, entries: [], settings: [] });
    expect(core.useLogs.getState().entries).toHaveLength(1);
    expect(core.useLogs.getState().entries[0]!.data).toEqual({ kind: 'meal', kcal: 550 });
  });

  it('pullAll follows hasMore with the advancing cursor', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(ok({ cursor: 1, entries: [wireMeal('a', 550)], settings: [], hasMore: true }))
      .mockResolvedValueOnce(ok({ cursor: 2, entries: [wireMeal('b', 800)], settings: [], hasMore: false }));
    vi.stubGlobal('fetch', fetchMock);

    await pullAll();

    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(JSON.parse(fetchMock.mock.calls[1]![1].body).cursor).toBe(1);
    expect(core.useLogs.getState().entries).toHaveLength(2);
  });

  it('pushEntry sends the wire shape and the current cursor', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(ok({ cursor: 5, entries: [], settings: [], hasMore: false }))
      .mockResolvedValueOnce(ok({ cursor: 6, entries: [], settings: [], hasMore: false }));
    vi.stubGlobal('fetch', fetchMock);
    await pullAll(); // sets cursor to 5

    await pushEntry({
      id: 'z',
      ts: 10,
      day: '2026-07-04',
      tracker: 'meals',
      source: 'manual',
      data: { kind: 'meal', kcal: 300 },
    });

    const body = lastBody(fetchMock);
    expect(body.cursor).toBe(5);
    expect(body.entries[0]).toMatchObject({
      id: 'z',
      kind: 'meal',
      payload: { kind: 'meal', kcal: 300 },
      deleted: false,
    });
    expect(typeof body.entries[0].updatedAt).toBe('number');
  });

  it('pushSettings sends one settings row', async () => {
    const fetchMock = vi.fn().mockResolvedValueOnce(ok({ cursor: 1, entries: [], settings: [], hasMore: false }));
    vi.stubGlobal('fetch', fetchMock);

    await pushSettings({
      onboarded: false,
      picked: {
        steps: true,
        workouts: true,
        meals: true,
        running: true,
        weight: true,
        swimming: false,
        classes: false,
        sleep: false,
      },
      rhythmDays: 3,
      nudge: { enabled: false, time: '17:30' },
      hasAccount: true,
      units: 'metric',
      kcalGoal: 2200,
      stepsGoalDay: 11500,
      stepsGoalWeek: 70000,
    });

    const body = lastBody(fetchMock);
    expect(body.settings).toHaveLength(1);
    expect(body.settings[0].key).toBe('settings');
    expect(body.settings[0].value.rhythmDays).toBe(3);
    expect(body.settings[0].value.nudge.enabled).toBe(false);
  });

  it('upserts pulled entries by id (later wins)', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(ok({ cursor: 1, entries: [wireMeal('a', 550)], settings: [], hasMore: false }))
      .mockResolvedValueOnce(ok({ cursor: 2, entries: [wireMeal('a', 800)], settings: [], hasMore: false }));
    vi.stubGlobal('fetch', fetchMock);

    await pullAll(); // entry a = 550, cursor 1
    await pushEntry({
      id: 'a',
      ts: 1,
      day: '2026-07-04',
      tracker: 'meals',
      source: 'manual',
      data: { kind: 'meal', kcal: 800 },
    }); // server echoes a = 800

    const entries = core.useLogs.getState().entries;
    expect(entries).toHaveLength(1);
    expect(entries[0]!.data).toEqual({ kind: 'meal', kcal: 800 });
  });

  it('pullAll resets settings to defaults so a prior account does not leak', async () => {
    core.useSettings.getState().set({ rhythmDays: 6, kcalGoal: 3000 });
    const fetchMock = vi.fn().mockResolvedValueOnce(ok({ cursor: 1, entries: [], settings: [], hasMore: false }));
    vi.stubGlobal('fetch', fetchMock);

    await pullAll();

    expect(core.useSettings.getState().rhythmDays).toBe(3);
    expect(core.useSettings.getState().kcalGoal).toBe(2200);
  });

  it('toWire maps data.kind to kind and data to payload', () => {
    const w = toWire({
      id: 'a',
      ts: 2,
      day: '2026-07-04',
      tracker: 'running',
      source: 'gps',
      data: { kind: 'run', km: 4.2 },
    });
    expect(w.kind).toBe('run');
    expect(w.payload).toEqual({ kind: 'run', km: 4.2 });
    expect(w.deleted).toBe(false);
  });

  it('applies a pulled settings row to the store', async () => {
    const fetchMock = vi.fn().mockResolvedValueOnce(
      ok({
        cursor: 1,
        entries: [],
        settings: [{ key: 'settings', value: { rhythmDays: 5, kcalGoal: 1800 }, updatedAt: 1 }],
        hasMore: false,
      }),
    );
    vi.stubGlobal('fetch', fetchMock);

    await pullAll();

    expect(core.useSettings.getState().rhythmDays).toBe(5);
    expect(core.useSettings.getState().kcalGoal).toBe(1800);
  });

  it('rejects when the server returns a non-2xx status', async () => {
    const fetchMock = vi.fn().mockResolvedValueOnce({ ok: false, status: 500, json: async () => ({}) });
    vi.stubGlobal('fetch', fetchMock);

    await expect(
      pushEntry({
        id: 'z',
        ts: 1,
        day: '2026-07-04',
        tracker: 'meals',
        source: 'manual',
        data: { kind: 'meal', kcal: 100 },
      }),
    ).rejects.toThrow('sync failed: 500');
  });
});
