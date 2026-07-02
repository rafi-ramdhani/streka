import { addDays, weekStartOf } from './days';
import { intentionalDays } from './streak';
import type { LogEntry } from './types';

// Distinct intentional-log days within the week starting at weekStart (Monday).
export function weeklyActiveDays(entries: LogEntry[], weekStart: string): number {
  const days = intentionalDays(entries);
  let count = 0;
  for (let i = 0; i < 7; i += 1) if (days.has(addDays(weekStart, i))) count += 1;
  return count;
}

// Intentional-log counts per weekday, Mon..Sun.
export function weekDayCounts(entries: LogEntry[], weekStart: string): number[] {
  const counts = [0, 0, 0, 0, 0, 0, 0];
  const dayIndex = new Map<string, number>();
  for (let i = 0; i < 7; i += 1) dayIndex.set(addDays(weekStart, i), i);
  for (const e of entries) {
    if (e.deleted || e.source === 'health') continue;
    const i = dayIndex.get(e.day);
    if (i !== undefined) counts[i] += 1;
  }
  return counts;
}

// Active-day counts for the 4 most recent weeks (the current one last).
export function monthWeekCounts(entries: LogEntry[], today: string): number[] {
  const currentWeek = weekStartOf(today);
  const out: number[] = [];
  for (let w = 3; w >= 0; w -= 1) {
    out.push(weeklyActiveDays(entries, addDays(currentWeek, -7 * w)));
  }
  return out;
}
