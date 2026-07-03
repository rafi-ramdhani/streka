import { isDemoData } from '@streka/core';
import { useLogs } from './core';

// This build has no automatic health source: steps and sleep are logged by
// hand like everything else. The demo dataset keeps its designed numbers so
// the screenshots and web app still read right; real users get null, which the
// board, trends, and goals render as a dash or fall back to logged entries.
export interface HealthToday {
  steps: number | null;
  sleep: { h: number; m: number } | null;
}

const DEMO: HealthToday = { steps: 8246, sleep: { h: 7, m: 20 } };

export function useHealthToday(): HealthToday {
  const demo = useLogs((s) => isDemoData(s.entries));
  return demo ? DEMO : { steps: null, sleep: null };
}
