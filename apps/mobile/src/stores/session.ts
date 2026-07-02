import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { logActivity } from '../core';
import { kvStorage } from '../db';

// Live workout session (Proto logic 67-86): local-only, saved set-by-set.
export interface SessionSet {
  label: string;
  done: boolean;
}

interface SessionState {
  active: boolean;
  startTs: number;
  name: string;
  sets: SessionSet[];
  start: (name: string) => void;
  toggleSet: (index: number) => void;
  addSet: () => void;
  discard: () => void;
  finish: () => void;
}

const DEFAULT_SETS: SessionSet[] = [
  { label: '60 kg × 8', done: false },
  { label: '60 kg × 8', done: false },
  { label: '62.5 kg × 6', done: false },
];

// Persisted so a live session survives reloads and crashes ("sessions save
// set-by-set locally"). The timer derives from startTs, so elapsed time stays
// correct across a relaunch.
export const useSession = create<SessionState>()(
  persist(
    (set, get) => ({
      active: false,
      startTs: 0,
      name: '',
      sets: [],
      start: (name) =>
        set({ active: true, startTs: Date.now(), name, sets: DEFAULT_SETS.map((s) => ({ ...s })) }),
      toggleSet: (index) =>
        set((s) => ({
          sets: s.sets.map((x, i) => (i === index ? { ...x, done: !x.done } : x)),
        })),
      addSet: () => set((s) => ({ sets: [...s.sets, { label: '62.5 kg × 6', done: false }] })),
      discard: () => set({ active: false }),
      finish: () => {
        const { startTs, name } = get();
        const mins = Math.max(1, Math.round((Date.now() - startTs) / 60000));
        logActivity({
          tracker: 'workouts',
          source: 'session',
          data: { kind: 'workout', name, mins },
          title: 'Workout logged',
        });
        set({ active: false });
      },
    }),
    {
      name: 'streka-session',
      storage: createJSONStorage(() => kvStorage),
      // A rehydrated "live" session must have a sane start time; anything
      // invalid or older than a day is an orphan, not a workout in progress.
      onRehydrateStorage: () => (state) => {
        if (!state?.active) return;
        const stale =
          !state.startTs || state.startTs <= 0 || Date.now() - state.startTs > 24 * 3_600_000;
        if (stale) useSession.setState({ active: false, startTs: 0, name: '', sets: [] });
      },
    },
  ),
);
