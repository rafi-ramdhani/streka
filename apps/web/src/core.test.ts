import { beforeEach, describe, expect, it } from 'vitest';
import { core, webToast, webToastError } from './core';

beforeEach(() => {
  localStorage.clear();
  core.useLogs.setState({ entries: [] });
});

describe('web core', () => {
  it('webToast uses honest account copy, not phone copy', () => {
    webToast('Meal logged');
    const toast = core.useToast.getState().toast;
    expect(toast?.title).toBe('Meal logged');
    expect(toast?.sub).toBe('Saved to your account');
  });

  it('webToastError surfaces an honest failure', () => {
    webToastError();
    expect(core.useToast.getState().toast?.title).toBe('Could not save');
  });

  it('log writes stay in memory, never localStorage', () => {
    core.useLogs.getState().append({
      id: 'x',
      ts: 1,
      day: '2026-07-04',
      tracker: 'meals',
      source: 'manual',
      data: { kind: 'meal', kcal: 550 },
    });
    expect(core.useLogs.getState().entries).toHaveLength(1);
    expect(localStorage.length).toBe(0);
  });
});
