import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { core } from '../core';
import { Board } from './Board';

function ok(body: unknown) {
  return { ok: true, json: async () => body };
}

beforeEach(() => {
  core.useLogs.setState({ entries: [] });
});
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe('Board (honest, empty account)', () => {
  it('shows no fabricated steps or sleep metrics', () => {
    render(<Board goGoals={() => {}} />);
    expect(screen.queryByText(/auto from watch/i)).toBeNull();
    expect(screen.queryByText('8,246')).toBeNull();
    expect(screen.queryByText(/Sleep/i)).toBeNull();
    expect(screen.queryByText('72.4')).toBeNull();
    expect(screen.getByText('0-day streak')).toBeTruthy();
  });

  it('uses a plain hyphen, not an em dash, for empty tiles', () => {
    render(<Board goGoals={() => {}} />);
    expect(screen.queryByText('—')).toBeNull(); // no em dash anywhere
    expect(screen.getAllByText('-').length).toBeGreaterThan(0);
  });

  it('logging a meal pushes it to the account', async () => {
    const fetchMock = vi.fn().mockResolvedValue(ok({ cursor: 1, entries: [], settings: [], hasMore: false }));
    vi.stubGlobal('fetch', fetchMock);
    const user = userEvent.setup();

    render(<Board goGoals={() => {}} />);
    await user.click(screen.getByText('Meals'));
    await user.click(screen.getByText('Regular meal'));

    expect(fetchMock).toHaveBeenCalledWith('/api/sync', expect.objectContaining({ method: 'POST' }));
    const body = JSON.parse(fetchMock.mock.calls[0]![1].body);
    expect(body.entries[0]).toMatchObject({ kind: 'meal', payload: { kind: 'meal', kcal: 550 } });
  });
});
