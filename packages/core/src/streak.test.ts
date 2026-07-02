import { describe, expect, it } from 'vitest';
import type { LogEntry, LogSource } from './types';
import { intentionalDays, isFirstLogOfDay, streak } from './streak';

let n = 0;
function entry(day: string, source: LogSource = 'manual', deleted = false): LogEntry {
  n += 1;
  return {
    id: `id-${n}`,
    ts: Date.parse(`${day}T10:00:00`),
    day,
    tracker: source === 'health' ? 'steps' : 'meals',
    source,
    data: { kind: 'meal', kcal: 300 },
    deleted,
  };
}

const TODAY = '2026-07-02';

describe('streak', () => {
  it('is 0 with no logs', () => {
    expect(streak(intentionalDays([]), TODAY)).toBe(0);
  });

  it('counts today when logged', () => {
    expect(streak(intentionalDays([entry(TODAY)]), TODAY)).toBe(1);
  });

  it('ends yesterday when today has no log yet', () => {
    const entries = [entry('2026-06-29'), entry('2026-06-30'), entry('2026-07-01')];
    expect(streak(intentionalDays(entries), TODAY)).toBe(3);
  });

  it('adds today on top of an existing run', () => {
    const entries = [
      entry('2026-06-29'),
      entry('2026-06-30'),
      entry('2026-07-01'),
      entry(TODAY),
    ];
    expect(streak(intentionalDays(entries), TODAY)).toBe(4);
  });

  it('breaks on a gap day', () => {
    const entries = [entry('2026-06-28'), entry('2026-06-30'), entry('2026-07-01')];
    expect(streak(intentionalDays(entries), TODAY)).toBe(2);
  });

  it('does not count health-only days (product rule 1)', () => {
    const entries = [
      entry('2026-06-30'),
      entry('2026-07-01', 'health'), // auto steps only, breaks the run
    ];
    expect(streak(intentionalDays(entries), TODAY)).toBe(0);
  });

  it('ignores deleted entries', () => {
    const entries = [entry(TODAY, 'manual', true)];
    expect(streak(intentionalDays(entries), TODAY)).toBe(0);
  });
});

describe('isFirstLogOfDay', () => {
  it('is true with no logs today', () => {
    expect(isFirstLogOfDay([entry('2026-07-01')], TODAY)).toBe(true);
  });

  it('is false once an intentional log exists today', () => {
    expect(isFirstLogOfDay([entry(TODAY)], TODAY)).toBe(false);
  });

  it('stays true when only health entries exist today', () => {
    expect(isFirstLogOfDay([entry(TODAY, 'health')], TODAY)).toBe(true);
  });

  it('stays true when the only intentional entry today is deleted', () => {
    expect(isFirstLogOfDay([entry(TODAY, 'manual', true)], TODAY)).toBe(true);
  });
});
