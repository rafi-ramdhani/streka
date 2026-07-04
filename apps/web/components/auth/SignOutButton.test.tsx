import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { SignOutButton } from './SignOutButton';

const { replace } = vi.hoisted(() => ({ replace: vi.fn() }));
vi.mock('next/navigation', () => ({ useRouter: () => ({ replace, push: vi.fn() }) }));

afterEach(cleanup);
beforeEach(() => replace.mockReset());

describe('SignOutButton', () => {
  it('posts to /api/auth/signout and returns to /', async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, status: 204 } as Response);
    global.fetch = fetchMock as unknown as typeof fetch;
    const user = userEvent.setup();

    render(<SignOutButton />);
    await user.click(screen.getByRole('button', { name: /sign out/i }));

    await waitFor(() => expect(replace).toHaveBeenCalledWith('/'));
    const [url, init] = fetchMock.mock.calls[0]!;
    expect(url).toBe('/api/auth/signout');
    expect(init).toMatchObject({ method: 'POST', credentials: 'same-origin' });
  });
});
