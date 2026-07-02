import { prevDay } from './days';
import type { LogEntry, LogSource } from './types';

export const INTENTIONAL_SOURCES: readonly LogSource[] = [
  'manual',
  'session',
  'gps',
  'scan',
];

function isIntentional(e: LogEntry): boolean {
  return !e.deleted && INTENTIONAL_SOURCES.includes(e.source);
}

export function intentionalDays(entries: LogEntry[]): Set<string> {
  const days = new Set<string>();
  for (const e of entries) if (isIntentional(e)) days.add(e.day);
  return days;
}

// Product rule 1: consecutive days with at least one intentional log. Today
// counts once logged; before that, the run ends yesterday.
export function streak(days: Set<string>, today: string): number {
  let d = days.has(today) ? today : prevDay(today);
  let count = 0;
  while (days.has(d)) {
    count += 1;
    d = prevDay(d);
  }
  return count;
}

export function isFirstLogOfDay(entries: LogEntry[], day: string): boolean {
  return !entries.some((e) => e.day === day && isIntentional(e));
}
