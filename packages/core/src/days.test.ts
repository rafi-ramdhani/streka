import { describe, expect, it } from 'vitest';
import { addDays, dayOf, prevDay, weekStartOf } from './days';

describe('day utilities', () => {
  it('prevDay crosses month boundaries', () => {
    expect(prevDay('2026-03-01')).toBe('2026-02-28');
    expect(prevDay('2026-01-01')).toBe('2025-12-31');
  });

  it('addDays moves forward and backward', () => {
    expect(addDays('2026-07-02', -1)).toBe('2026-07-01');
    expect(addDays('2026-07-02', 7)).toBe('2026-07-09');
    expect(addDays('2026-02-27', 2)).toBe('2026-03-01');
  });

  it('weekStartOf returns the Monday of the week', () => {
    expect(weekStartOf('2026-07-02')).toBe('2026-06-29'); // Thu -> Mon
    expect(weekStartOf('2026-06-29')).toBe('2026-06-29'); // Mon -> itself
    expect(weekStartOf('2026-07-05')).toBe('2026-06-29'); // Sun -> previous Mon
  });

  it('dayOf formats a timestamp as local YYYY-MM-DD', () => {
    const ts = new Date(2026, 6, 2, 9, 30).getTime();
    expect(dayOf(ts)).toBe('2026-07-02');
  });
});
