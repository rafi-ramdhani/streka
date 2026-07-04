import { cleanup, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import AppLayout from './layout';

const { replace } = vi.hoisted(() => ({ replace: vi.fn() }));
vi.mock('next/navigation', () => ({ useRouter: () => ({ replace, push: vi.fn() }) }));

afterEach(cleanup);
beforeEach(() => replace.mockReset());

describe('app segment guard', () => {
  it('renders children when /api/auth/me is authenticated', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ user: { email: 'a@b.com' } }),
    } as Response) as unknown as typeof fetch;

    render(<AppLayout><div>secret content</div></AppLayout>);
    expect(await screen.findByText('secret content')).toBeTruthy();
    expect(replace).not.toHaveBeenCalled();
  });

  it('redirects to /signin when /api/auth/me is 401', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 401,
      json: async () => ({}),
    } as Response) as unknown as typeof fetch;

    render(<AppLayout><div>secret content</div></AppLayout>);
    await waitFor(() => expect(replace).toHaveBeenCalledWith('/signin'));
    expect(screen.queryByText('secret content')).toBeNull();
  });
});
