import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { AuthedEmailProvider } from '@/components/auth/AuthedContext';
import { core } from './core';
import { Dashboard } from './Dashboard';

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
}));

function ok(body: unknown) {
  return { ok: true, json: async () => body };
}

function renderDashboard() {
  return render(
    <AuthedEmailProvider email="rafi@example.com">
      <Dashboard />
    </AuthedEmailProvider>,
  );
}

beforeEach(() => {
  core.useLogs.setState({ entries: [] });
});
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe('Dashboard', () => {
  it('renders the nav and signed-in email, then hydrates to the board', async () => {
    const fetchMock = vi.fn().mockResolvedValue(ok({ cursor: 0, entries: [], settings: [], hasMore: false }));
    vi.stubGlobal('fetch', fetchMock);

    renderDashboard();

    expect(screen.getByText('Board')).toBeTruthy();
    expect(screen.getByText('Trends')).toBeTruthy();
    expect(screen.getByText('Goals')).toBeTruthy();
    expect(screen.getByText('rafi@example.com')).toBeTruthy();

    await waitFor(() => expect(screen.getByText('Today')).toBeTruthy());
    expect(fetchMock).toHaveBeenCalledWith('/api/sync', expect.objectContaining({ method: 'POST' }));
  });

  it('shows an honest error state when the pull fails', async () => {
    const fetchMock = vi.fn().mockRejectedValue(new Error('down'));
    vi.stubGlobal('fetch', fetchMock);

    renderDashboard();

    await waitFor(() => expect(screen.getByText('Could not load your data')).toBeTruthy());
  });

  it('switches sections via the nav pills', async () => {
    const fetchMock = vi.fn().mockResolvedValue(ok({ cursor: 0, entries: [], settings: [], hasMore: false }));
    vi.stubGlobal('fetch', fetchMock);
    const user = userEvent.setup();

    renderDashboard();
    await waitFor(() => expect(screen.getByText('Today')).toBeTruthy());

    await user.click(screen.getByText('Trends'));
    expect(screen.getByText('Consistency · last 3 weeks')).toBeTruthy();

    await user.click(screen.getByText('Goals'));
    expect(screen.getByText('+ New goal')).toBeTruthy();
  });

  it('renders the sign-out control in the header', async () => {
    const fetchMock = vi.fn().mockResolvedValue(ok({ cursor: 0, entries: [], settings: [], hasMore: false }));
    vi.stubGlobal('fetch', fetchMock);

    renderDashboard();

    expect(screen.getByRole('button', { name: 'Sign out' })).toBeTruthy();
  });
});
