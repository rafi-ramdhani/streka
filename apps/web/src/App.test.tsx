import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { App } from './App';
import { core, ensureSeeded } from './core';

beforeEach(() => {
  localStorage.clear();
  core.useLogs.setState({ entries: [] });
  ensureSeeded();
});
afterEach(cleanup);

describe('web board', () => {
  it('renders the seeded day-12 board', () => {
    render(<App />);
    expect(screen.getByText('12-day streak')).toBeTruthy();
    expect(screen.getByText('4.2 km')).toBeTruthy();
    expect(screen.getByText('1,430')).toBeTruthy();
  });

  it('logs a meal from the modal and shows the web toast', async () => {
    const user = userEvent.setup();
    render(<App />);
    await user.click(screen.getByText('Meals'));
    await user.click(screen.getByText('Regular meal'));
    expect(screen.getByText('Meal logged · 550 kcal')).toBeTruthy();
    expect(screen.getByText('Synced · visible on your phone in a moment')).toBeTruthy();
    expect(screen.getByText('1,980')).toBeTruthy(); // 1430 + 550
  });

  it('switches to Goals via the nav pills', async () => {
    const user = userEvent.setup();
    render(<App />);
    await user.click(screen.getByText('Goals'));
    expect(screen.getByText('70,000 steps a week')).toBeTruthy();
  });

  it('below 860px the modal becomes a bottom sheet', async () => {
    Object.defineProperty(window, 'innerWidth', { writable: true, value: 500 });
    const user = userEvent.setup();
    render(<App />);
    await user.click(screen.getByText('Meals'));
    const card = screen.getByText('Log a meal').parentElement!.parentElement!;
    expect(card.style.borderRadius).toBe('22px 22px 0 0');
    expect(card.style.width).toBe('100%');
    Object.defineProperty(window, 'innerWidth', { writable: true, value: 1024 });
  });
});
