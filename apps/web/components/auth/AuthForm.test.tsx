import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { AuthForm } from './AuthForm';

const { push } = vi.hoisted(() => ({ push: vi.fn() }));
vi.mock('next/navigation', () => ({ useRouter: () => ({ push, replace: vi.fn() }) }));

function mockFetch(res: Partial<Response> & { status: number; ok: boolean }) {
  const fn = vi.fn().mockResolvedValue({ json: async () => ({}), ...res } as Response);
  global.fetch = fn as unknown as typeof fetch;
  return fn;
}

afterEach(cleanup);
beforeEach(() => {
  push.mockReset();
});

describe('AuthForm', () => {
  it('signin success posts credentials and navigates to /app', async () => {
    const fetchMock = mockFetch({ ok: true, status: 200 });
    const user = userEvent.setup();
    render(<AuthForm mode="signin" />);
    await user.type(screen.getByLabelText(/email/i), 'a@b.com');
    await user.type(screen.getByLabelText(/password/i), 'password123');
    await user.click(screen.getByRole('button', { name: /sign in/i }));

    await waitFor(() => expect(push).toHaveBeenCalledWith('/app'));
    const [url, init] = fetchMock.mock.calls[0]!;
    expect(url).toBe('/api/auth/signin');
    expect(init).toMatchObject({ method: 'POST', credentials: 'same-origin' });
    expect(JSON.parse(init.body)).toEqual({ email: 'a@b.com', password: 'password123' });
  });

  it('signin 401 shows the wrong-credentials message and does not navigate', async () => {
    mockFetch({ ok: false, status: 401 });
    const user = userEvent.setup();
    render(<AuthForm mode="signin" />);
    await user.type(screen.getByLabelText(/email/i), 'a@b.com');
    await user.type(screen.getByLabelText(/password/i), 'password123');
    await user.click(screen.getByRole('button', { name: /sign in/i }));

    expect((await screen.findByRole('alert')).textContent).toContain('Wrong email or password');
    expect(push).not.toHaveBeenCalled();
  });

  it('signup 409 shows the duplicate-email message', async () => {
    mockFetch({ ok: false, status: 409 });
    const user = userEvent.setup();
    render(<AuthForm mode="signup" />);
    await user.type(screen.getByLabelText(/email/i), 'a@b.com');
    await user.type(screen.getByLabelText(/password/i), 'password123');
    await user.click(screen.getByRole('button', { name: /sign up/i }));

    expect((await screen.findByRole('alert')).textContent).toContain('That email is already registered');
  });

  it('disables the submit button while the request is in flight', async () => {
    let resolve!: (v: unknown) => void;
    global.fetch = vi.fn().mockReturnValue(new Promise((r) => (resolve = r))) as unknown as typeof fetch;
    const user = userEvent.setup();
    render(<AuthForm mode="signin" />);
    await user.type(screen.getByLabelText(/email/i), 'a@b.com');
    await user.type(screen.getByLabelText(/password/i), 'password123');
    await user.click(screen.getByRole('button', { name: /sign in/i }));

    expect((screen.getByRole('button', { name: /sign in/i }) as HTMLButtonElement).disabled).toBe(true);
    resolve({ ok: true, status: 200, json: async () => ({}) });
  });
});
