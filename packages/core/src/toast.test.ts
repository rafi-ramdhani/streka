import { describe, expect, it } from 'vitest';
import { toastSub } from './toast';

describe('toastSub, non-first log of the day', () => {
  it('no account', () => {
    expect(toastSub({ account: false, online: true, firstLog: false, streakN: 5 })).toBe(
      'Saved on this phone',
    );
    expect(toastSub({ account: false, online: false, firstLog: false, streakN: 5 })).toBe(
      'Saved on this phone',
    );
  });

  it('account, online', () => {
    expect(toastSub({ account: true, online: true, firstLog: false, streakN: 5 })).toBe(
      'Synced to your account',
    );
  });

  it('account, offline', () => {
    expect(toastSub({ account: true, online: false, firstLog: false, streakN: 5 })).toBe(
      'Saved — will sync when online',
    );
  });
});

describe('toastSub, first log of the day (streak line)', () => {
  it('day 1 says started, on this phone', () => {
    expect(toastSub({ account: false, online: true, firstLog: true, streakN: 1 })).toBe(
      'Streak started — day 1 · on this phone',
    );
  });

  it('day N says kept, synced', () => {
    expect(toastSub({ account: true, online: true, firstLog: true, streakN: 12 })).toBe(
      'Streak kept — day 12 · synced',
    );
  });

  it('day N offline says will sync', () => {
    expect(toastSub({ account: true, online: false, firstLog: true, streakN: 12 })).toBe(
      'Streak kept — day 12 · will sync',
    );
  });
});
