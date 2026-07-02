import { describe, expect, it } from 'vitest';
import type { LogEntry, LogSource } from './types';
import { monthWeekCounts, weekDayCounts, weeklyActiveDays } from './weeks';

let n = 0;
function entry(day: string, source: LogSource = 'manual'): LogEntry {
  n += 1;
  return {
    id: `id-${n}`,
    ts: Date.parse(`${day}T10:00:00`) + n,
    day,
    tracker: 'meals',
    source,
    data: { kind: 'meal', kcal: 300 },
  };
}

const MON = '2026-06-29'; // Monday of the week containing 2026-07-02

describe('weeklyActiveDays', () => {
  it('counts distinct intentional days, not raw logs', () => {
    const entries = [entry('2026-06-29'), entry('2026-06-29'), entry('2026-07-01')];
    expect(weeklyActiveDays(entries, MON)).toBe(2);
  });

  it('excludes health entries and other weeks', () => {
    const entries = [entry('2026-06-30', 'health'), entry('2026-06-28')]; // prev Sunday
    expect(weeklyActiveDays(entries, MON)).toBe(0);
  });
});

describe('weekDayCounts', () => {
  it('returns Mon..Sun intentional-log counts', () => {
    const entries = [
      entry('2026-06-29'),
      entry('2026-06-29'),
      entry('2026-07-01'),
      entry('2026-07-05'),
      entry('2026-06-30', 'health'),
    ];
    expect(weekDayCounts(entries, MON)).toEqual([2, 0, 1, 0, 0, 0, 1]);
  });
});

describe('monthWeekCounts', () => {
  it('gives active-day counts for the 4 most recent weeks, oldest first', () => {
    const entries = [
      entry('2026-06-10'), // week of Jun 8
      entry('2026-06-11'),
      entry('2026-06-16'), // week of Jun 15
      entry('2026-06-24'), // week of Jun 22
      entry('2026-06-29'), // current week
      entry('2026-07-01'),
    ];
    expect(monthWeekCounts(entries, '2026-07-02')).toEqual([2, 1, 1, 2]);
  });
});
