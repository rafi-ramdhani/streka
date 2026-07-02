import type { LogEntry } from './types';

export interface BoardDay {
  workout?: { name: string; mins: number };
  mealsKcal: number;
  runKm?: number;
  swimM?: number;
  weightKg?: number;
  weightLoggedToday: boolean;
  classDone: boolean;
}

// Per-tile state for one calendar day. Weight is the only tracker whose value
// (the baseline) carries across days; everything else resets daily.
export function todayBoard(entries: LogEntry[], day: string): BoardDay {
  const live = entries.filter((e) => !e.deleted);
  const today = live.filter((e) => e.day === day);
  const latest = <T>(pick: (e: LogEntry) => T | undefined, list: LogEntry[]): T | undefined => {
    let best: T | undefined;
    let bestTs = -Infinity;
    for (const e of list) {
      const v = pick(e);
      if (v !== undefined && e.ts >= bestTs) {
        best = v;
        bestTs = e.ts;
      }
    }
    return best;
  };

  const weightEntry = latest((e) => (e.data.kind === 'weight' ? e : undefined), live);

  return {
    workout: latest(
      (e) => (e.data.kind === 'workout' ? { name: e.data.name, mins: e.data.mins } : undefined),
      today,
    ),
    mealsKcal: today.reduce((a, e) => a + (e.data.kind === 'meal' ? e.data.kcal : 0), 0),
    runKm: latest((e) => (e.data.kind === 'run' ? e.data.km : undefined), today),
    swimM: latest((e) => (e.data.kind === 'swim' ? e.data.m : undefined), today),
    weightKg: weightEntry?.data.kind === 'weight' ? weightEntry.data.kg : undefined,
    weightLoggedToday: weightEntry?.day === day,
    classDone: today.some((e) => e.data.kind === 'class'),
  };
}
