import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { core } from './core';
import { logFromWeb, updateSettings } from './lib';

function ok(body: unknown) {
  return { ok: true, json: async () => body };
}

beforeEach(() => {
  core.useLogs.setState({ entries: [] });
});
afterEach(() => {
  vi.unstubAllGlobals();
});

describe('logFromWeb', () => {
  it('appends locally and pushes the entry wire shape', async () => {
    const fetchMock = vi.fn().mockResolvedValue(ok({ cursor: 1, entries: [], settings: [], hasMore: false }));
    vi.stubGlobal('fetch', fetchMock);

    logFromWeb({
      tracker: 'meals',
      source: 'manual',
      data: { kind: 'meal', kcal: 550 },
      title: 'Meal logged',
    });

    expect(core.useLogs.getState().entries).toHaveLength(1);
    expect(fetchMock).toHaveBeenCalledWith('/api/sync', expect.objectContaining({ method: 'POST' }));
    const body = JSON.parse(fetchMock.mock.calls[0]![1].body);
    expect(body.entries[0]).toMatchObject({ kind: 'meal', payload: { kind: 'meal', kcal: 550 } });

    await vi.waitFor(() => {
      expect(core.useToast.getState().toast?.sub).toBe('Saved to your account');
    });
  });
});

describe('updateSettings', () => {
  it('sets the store and pushes the whole settings object', async () => {
    const fetchMock = vi.fn().mockResolvedValue(ok({ cursor: 1, entries: [], settings: [], hasMore: false }));
    vi.stubGlobal('fetch', fetchMock);

    updateSettings({ nudge: { enabled: false, time: '17:30' } });

    expect(core.useSettings.getState().nudge.enabled).toBe(false);
    expect(fetchMock).toHaveBeenCalled();
    const body = JSON.parse(fetchMock.mock.calls[0]![1].body);
    expect(body.settings[0].key).toBe('settings');
    expect(body.settings[0].value.nudge.enabled).toBe(false);
  });
});

describe('write failures surface an honest toast', () => {
  it('logFromWeb keeps the optimistic append but shows the error toast when the push rejects', async () => {
    const fetchMock = vi.fn().mockRejectedValue(new Error('offline'));
    vi.stubGlobal('fetch', fetchMock);

    logFromWeb({
      tracker: 'meals',
      source: 'manual',
      data: { kind: 'meal', kcal: 550 },
      title: 'Meal logged',
    });

    expect(core.useLogs.getState().entries).toHaveLength(1);
    await vi.waitFor(() => {
      expect(core.useToast.getState().toast?.title).toBe('Could not save');
    });
  });

  it('updateSettings shows the error toast when the push rejects', async () => {
    const fetchMock = vi.fn().mockRejectedValue(new Error('offline'));
    vi.stubGlobal('fetch', fetchMock);

    updateSettings({ nudge: { enabled: true, time: '08:00' } });

    expect(core.useSettings.getState().nudge.enabled).toBe(true);
    await vi.waitFor(() => {
      expect(core.useToast.getState().toast?.title).toBe('Could not save');
    });
  });
});
