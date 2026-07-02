import type { LogEntry } from './types';

// Set labels are human strings like "62.5 kg × 6"; the bests card needs the
// heaviest weight actually lifted.
export function maxWeightKg(labels: string[]): number | null {
  let max: number | null = null;
  for (const label of labels) {
    const m = /([\d.]+)\s*kg/.exec(label);
    if (!m) continue;
    const kg = Number(m[1]);
    if (Number.isFinite(kg) && (max === null || kg > max)) max = kg;
  }
  return max;
}

// The most recent top set recorded for an exercise; drives the session
// screen's "last: 60 kg × 8" chip and upgrades template set prescriptions.
export function lastTopSet(entries: LogEntry[], exercise: string): string | null {
  let bestTs = -Infinity;
  let top: string | null = null;
  for (const e of entries) {
    if (e.deleted || e.data.kind !== 'workout' || !e.data.exercises || e.ts <= bestTs) continue;
    for (const ex of e.data.exercises) {
      if (ex.name === exercise && ex.topSet) {
        bestTs = e.ts;
        top = ex.topSet;
      }
    }
  }
  return top;
}

// Heaviest lift on record (optionally since a day), for the bests card.
export function bestLift(
  entries: LogEntry[],
  sinceDay?: string,
): { kg: number; exercise: string } | null {
  let best: { kg: number; exercise: string } | null = null;
  for (const e of entries) {
    if (e.deleted || e.data.kind !== 'workout' || !e.data.exercises) continue;
    if (sinceDay && e.day < sinceDay) continue;
    for (const ex of e.data.exercises) {
      if (!ex.topSet) continue;
      const kg = maxWeightKg([ex.topSet]);
      if (kg !== null && (best === null || kg > best.kg)) best = { kg, exercise: ex.name };
    }
  }
  return best;
}
