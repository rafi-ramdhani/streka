import type { Ingredient } from './scan';

// Service seams for the deferred backends (TAD section 1). UI code depends on
// these interfaces only; the mocks reproduce the prototype's demo behavior.

export interface ScanMatch {
  name: string;
  kcal: number;
  likely?: boolean;
}

export interface ScanResult {
  dish: string;
  confidence: 'high' | 'low';
  ingredients: Ingredient[];
  matches?: ScanMatch[];
}

export interface ScanService {
  analyze: () => Promise<ScanResult>;
}

const HIGH: ScanResult = {
  dish: 'Chicken fried rice',
  confidence: 'high',
  ingredients: [
    { name: 'Rice, fried', kcal: 280 },
    { name: 'Chicken thigh', kcal: 180 },
    { name: 'Egg', kcal: 70 },
    { name: 'Spring onion oil', kcal: 90 },
  ],
};

const LOW: ScanResult = {
  dish: 'Not sure',
  confidence: 'low',
  ingredients: [],
  matches: [
    { name: 'Beef stew', kcal: 450, likely: true },
    { name: 'Chicken curry', kcal: 520 },
    { name: 'Lentil soup', kcal: 310 },
  ],
};

// Alternates high/low confidence per call, like the prototype's scanCount % 2.
export function createMockScan(delayMs = 1400): ScanService {
  let calls = 0;
  return {
    analyze: async () => {
      calls += 1;
      if (delayMs > 0) await new Promise((r) => setTimeout(r, delayMs));
      return calls % 2 === 1 ? HIGH : LOW;
    },
  };
}

export interface HealthProvider {
  todaySteps: () => number;
  lastSleep: () => { h: number; m: number } | null;
}

export function mockHealth(fresh: boolean): HealthProvider {
  return {
    todaySteps: () => (fresh ? 2104 : 8246),
    lastSleep: () => (fresh ? null : { h: 7, m: 20 }),
  };
}

export interface SyncService {
  push: (count: number) => Promise<void>;
}

export const mockSync: SyncService = { push: async () => {} };

export interface NudgeScheduler {
  schedule: (time: string, enabled: boolean) => void;
}

export const mockNudges: NudgeScheduler = { schedule: () => {} };
