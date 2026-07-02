import { addDays } from './days';
import type { LogData, LogEntry, LogSource, Settings, TrackerId } from './types';

// The day-12 demo dataset the prototypes present: an 11-day streak ending
// yesterday, a 30-day weight history landing on 72.4, and health step data.
// Used by the returning-account path, the web app, and dev verification.
// A fresh onboarding never sees this. Trends render from these real logs;
// the prototype's static bar heights are illustrative only.
export function seedDemo(today: string): {
  entries: LogEntry[];
  settings: Partial<Settings>;
} {
  const entries: LogEntry[] = [];
  let seq = 0;
  const push = (day: string, tracker: TrackerId, source: LogSource, data: LogData) => {
    seq += 1;
    entries.push({
      id: `seed-${seq}`,
      ts: Date.parse(`${day}T10:00:00`) + seq * 60_000,
      day,
      tracker,
      source,
      data,
    });
  };

  // 11 consecutive intentional-log days ending yesterday, rotating trackers.
  for (let i = 11; i >= 1; i -= 1) {
    const day = addDays(today, -i);
    switch (i % 4) {
      case 0:
        push(day, 'workouts', 'session', { kind: 'workout', name: 'Upper body', mins: 45 });
        break;
      case 1:
        push(day, 'running', 'gps', { kind: 'run', km: i === 5 ? 5.4 : 4.2 });
        break;
      case 2:
        push(day, 'meals', 'manual', { kind: 'meal', kcal: 550 });
        break;
      default:
        push(day, 'swimming', 'manual', { kind: 'swim', m: 800 });
    }
  }

  // Weight every 4 days, 73.6 down to 72.4; the 4-day cadence never extends
  // the consecutive-day streak beyond the 11-day window above.
  const kgs = [73.6, 73.4, 73.2, 73.1, 72.9, 72.8, 72.6, 72.4];
  kgs.forEach((kg, idx) => {
    const daysAgo = 30 - idx * 4; // 30, 26, ... 2
    push(addDays(today, -daysAgo), 'weight', 'manual', { kind: 'weight', kg });
  });

  // Health steps history (auto, never counts toward the streak).
  const steps = [9120, 11480, 14206, 7630, 10240, 8925, 12010];
  steps.forEach((count, idx) => {
    push(addDays(today, -(idx + 1)), 'steps', 'health', { kind: 'steps', count });
  });

  return {
    entries,
    settings: {
      onboarded: true,
      hasAccount: true,
      healthConnected: true,
      picked: {
        steps: true,
        workouts: true,
        meals: true,
        running: true,
        weight: true,
        swimming: true,
        classes: true,
        sleep: true,
      },
    },
  };
}
