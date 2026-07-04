import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import AppHome from './page';
import { AuthedEmailProvider } from '@/components/auth/AuthedContext';

vi.mock('next/navigation', () => ({ useRouter: () => ({ replace: vi.fn(), push: vi.fn() }) }));

afterEach(cleanup);

describe('app home', () => {
  it('greets the signed-in user and shows a sign-out button', () => {
    render(
      <AuthedEmailProvider email="a@b.com">
        <AppHome />
      </AuthedEmailProvider>,
    );
    expect(screen.getByText(/a@b\.com/)).toBeTruthy();
    expect(screen.getByRole('button', { name: /sign out/i })).toBeTruthy();
  });
});
