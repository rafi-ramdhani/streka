import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { core } from '../core';
import { Goals } from './Goals';

function ok(body: unknown) {
  return { ok: true, json: async () => body };
}

beforeEach(() => {
  core.useLogs.setState({ entries: [] });
  core.useSettings.getState().set({ rhythmDays: 3, nudge: { enabled: true, time: '17:30' } });
});
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe('Goals (honest, lean)', () => {
  it('drops the fabricated steps and weight-target cards', () => {
    render(<Goals />);
    expect(screen.queryByText('70,000 steps a week')).toBeNull();
    expect(screen.queryByText('Reach 70 kg')).toBeNull();
    expect(screen.queryByText(/auto from watch/i)).toBeNull();
    expect(screen.getByText('Active 3 days a week')).toBeTruthy();
    expect(screen.getByText('+ New goal')).toBeTruthy();
  });

  it('toggling the nudge pushes the settings row', async () => {
    const fetchMock = vi.fn().mockResolvedValue(ok({ cursor: 1, entries: [], settings: [], hasMore: false }));
    vi.stubGlobal('fetch', fetchMock);
    const user = userEvent.setup();

    render(<Goals />);
    await user.click(screen.getByRole('switch'));

    expect(core.useSettings.getState().nudge.enabled).toBe(false);
    expect(fetchMock).toHaveBeenCalledWith('/api/sync', expect.objectContaining({ method: 'POST' }));
    const body = JSON.parse(fetchMock.mock.calls[0]![1].body);
    expect(body.settings[0].key).toBe('settings');
  });
});
