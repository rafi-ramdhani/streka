import { describe, expect, it } from 'vitest';
import type { LogData, LogEntry } from './types';
import { todayBoard } from './board';

let n = 0;
function entry(day: string, data: LogData, opts: Partial<LogEntry> = {}): LogEntry {
  n += 1;
  const tracker =
    data.kind === 'workout'
      ? 'workouts'
      : data.kind === 'meal'
        ? 'meals'
        : data.kind === 'run'
          ? 'running'
          : data.kind === 'swim'
            ? 'swimming'
            : data.kind === 'weight'
              ? 'weight'
              : 'classes';
  return {
    id: `id-${n}`,
    ts: Date.parse(`${day}T10:00:00`) + n, // later entries have later ts
    day,
    tracker,
    source: 'manual',
    data,
    ...opts,
  };
}

const TODAY = '2026-07-02';

describe('todayBoard', () => {
  it('is empty with no entries (weight baseline absent)', () => {
    const b = todayBoard([], TODAY);
    expect(b).toEqual({
      workout: undefined,
      mealsKcal: 0,
      runKm: undefined,
      swimM: undefined,
      weightKg: undefined,
      weightLoggedToday: false,
      classDone: false,
    });
  });

  it('sums meals across the day', () => {
    const b = todayBoard(
      [entry(TODAY, { kind: 'meal', kcal: 300 }), entry(TODAY, { kind: 'meal', kcal: 550 })],
      TODAY,
    );
    expect(b.mealsKcal).toBe(850);
  });

  it('takes the latest run of the day and reports workout details', () => {
    const b = todayBoard(
      [
        entry(TODAY, { kind: 'run', km: 2 }),
        entry(TODAY, { kind: 'run', km: 5 }),
        entry(TODAY, { kind: 'workout', name: 'Upper body', mins: 45 }),
      ],
      TODAY,
    );
    expect(b.runKm).toBe(5);
    expect(b.workout).toEqual({ name: 'Upper body', mins: 45 });
  });

  it('weight baseline persists from earlier days without weightLoggedToday', () => {
    const b = todayBoard([entry('2026-06-29', { kind: 'weight', kg: 72.4 })], TODAY);
    expect(b.weightKg).toBe(72.4);
    expect(b.weightLoggedToday).toBe(false);
  });

  it('weight logged today flips the flag and wins over older entries', () => {
    const b = todayBoard(
      [
        entry('2026-06-29', { kind: 'weight', kg: 72.4 }),
        entry(TODAY, { kind: 'weight', kg: 72.1 }),
      ],
      TODAY,
    );
    expect(b.weightKg).toBe(72.1);
    expect(b.weightLoggedToday).toBe(true);
  });

  it('excludes deleted entries', () => {
    const b = todayBoard([entry(TODAY, { kind: 'run', km: 4.2 }, { deleted: true })], TODAY);
    expect(b.runKm).toBeUndefined();
  });

  it('ignores other days for daily trackers', () => {
    const b = todayBoard(
      [entry('2026-07-01', { kind: 'meal', kcal: 800 }), entry('2026-07-01', { kind: 'class' })],
      TODAY,
    );
    expect(b.mealsKcal).toBe(0);
    expect(b.classDone).toBe(false);
  });
});
