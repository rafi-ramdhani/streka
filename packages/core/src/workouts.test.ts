import { describe, expect, it } from 'vitest';
import type { LogEntry } from './types';
import { bestLift, lastTopSet, maxWeightKg } from './workouts';

function workout(
  id: string,
  day: string,
  exercises: { name: string; topSet?: string }[],
  deleted = false,
): LogEntry {
  return {
    id,
    ts: Date.parse(`${day}T10:00:00`),
    day,
    tracker: 'workouts',
    source: 'session',
    data: { kind: 'workout', name: 'Upper body', mins: 45, exercises },
    deleted,
  };
}

describe('maxWeightKg', () => {
  it('parses the heaviest kg value from set labels', () => {
    expect(maxWeightKg(['60 kg × 8', '62.5 kg × 6', '55 kg × 10'])).toBe(62.5);
  });

  it('ignores labels without a weight', () => {
    expect(maxWeightKg(['12 reps', 'bodyweight × 15', '40 kg × 5'])).toBe(40);
  });

  it('returns null when nothing parses', () => {
    expect(maxWeightKg(['12 reps', ''])).toBeNull();
    expect(maxWeightKg([])).toBeNull();
  });
});

describe('lastTopSet', () => {
  const entries = [
    workout('a', '2026-06-20', [{ name: 'Bench press', topSet: '62.5 kg × 6' }]),
    workout('b', '2026-06-28', [
      { name: 'Bench press', topSet: '60 kg × 8' },
      { name: 'Lat pulldown', topSet: '55 kg × 10' },
    ]),
  ];

  it('returns the most recent top set for the exercise', () => {
    expect(lastTopSet(entries, 'Bench press')).toBe('60 kg × 8');
    expect(lastTopSet(entries, 'Lat pulldown')).toBe('55 kg × 10');
  });

  it('returns null for unseen exercises and ignores tombstones', () => {
    expect(lastTopSet(entries, 'Squat')).toBeNull();
    const dead = [workout('c', '2026-06-29', [{ name: 'Squat', topSet: '80 kg × 5' }], true)];
    expect(lastTopSet(dead, 'Squat')).toBeNull();
  });
});

describe('bestLift', () => {
  const entries = [
    workout('a', '2026-06-20', [
      { name: 'Bench press', topSet: '62.5 kg × 6' },
      { name: 'Lat pulldown', topSet: '55 kg × 10' },
    ]),
    workout('b', '2026-06-28', [{ name: 'Bench press', topSet: '60 kg × 8' }]),
  ];

  it('returns the heaviest lift across workout history', () => {
    expect(bestLift(entries)).toEqual({ kg: 62.5, exercise: 'Bench press' });
  });

  it('respects the sinceDay window', () => {
    expect(bestLift(entries, '2026-06-25')).toEqual({ kg: 60, exercise: 'Bench press' });
  });

  it('returns null when no exercise carries a weight', () => {
    expect(bestLift([workout('c', '2026-06-28', [{ name: 'Plank', topSet: '40 sec' }])])).toBeNull();
  });
});
