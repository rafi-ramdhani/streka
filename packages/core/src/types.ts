export type TrackerId =
  | 'steps'
  | 'workouts'
  | 'meals'
  | 'running'
  | 'weight'
  | 'swimming'
  | 'classes'
  | 'sleep';

// 'health' entries arrive automatically (steps, sleep, watch imports) and per
// product rule 1 never count toward the streak.
export type LogSource = 'manual' | 'session' | 'gps' | 'scan' | 'health';

export interface WorkoutData {
  kind: 'workout';
  name: string;
  mins: number;
}
export interface MealData {
  kind: 'meal';
  kcal: number;
  label?: string;
  scanned?: boolean;
}
export interface RunData {
  kind: 'run';
  km: number;
  time?: string;
  pace?: string;
}
export interface SwimData {
  kind: 'swim';
  m: number;
}
export interface WeightData {
  kind: 'weight';
  kg: number;
}
export interface ClassData {
  kind: 'class';
  name?: string;
}
export interface StepsData {
  kind: 'steps';
  count: number;
}
export interface SleepData {
  kind: 'sleep';
  hours: number;
  minutes: number;
}

export type LogData =
  | WorkoutData
  | MealData
  | RunData
  | SwimData
  | WeightData
  | ClassData
  | StepsData
  | SleepData;

// Immutable event, product rule 5: client UUID + timestamp, last-write-wins,
// deletion is a tombstone.
export interface LogEntry {
  id: string;
  ts: number;
  day: string; // local YYYY-MM-DD at creation time
  tracker: TrackerId;
  source: LogSource;
  data: LogData;
  deleted?: boolean;
}

export interface Settings {
  onboarded: boolean;
  picked: Record<TrackerId, boolean>;
  rhythmDays: 2 | 3 | 4 | 5 | 6;
  nudge: { enabled: boolean; time: string };
  healthConnected: boolean;
  hasAccount: boolean;
  units: 'metric' | 'imperial';
  kcalGoal: number;
  stepsGoalDay: number;
  stepsGoalWeek: number;
}

export const DEFAULT_SETTINGS: Settings = {
  onboarded: false,
  picked: {
    steps: true,
    workouts: true,
    meals: true,
    running: true,
    weight: true,
    swimming: false,
    classes: false,
    sleep: false,
  },
  rhythmDays: 3,
  nudge: { enabled: true, time: '17:30' },
  healthConnected: false,
  hasAccount: false,
  units: 'metric',
  kcalGoal: 2200,
  stepsGoalDay: 11500,
  stepsGoalWeek: 70000,
};
