import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { lastTopSet, summarizeSession } from '@streka/core';
import { core, logActivity } from '../core';
import { kvStorage } from '../db';

// Live workout session (Proto logic 67-86): local-only, saved set-by-set.
export interface SessionSet {
  label: string;
  done: boolean;
}

export interface SessionExercise {
  name: string;
  sets: SessionSet[];
}

interface SessionState {
  active: boolean;
  startTs: number;
  name: string;
  exercises: SessionExercise[];
  exIndex: number;
  start: (name: string) => void;
  toggleSet: (index: number) => void;
  addSet: () => void;
  nextExercise: () => void;
  discard: () => void;
  finish: () => void;
}

// Starter plans behind the workout sheet templates. Exercise counts match the
// sheet metas (6 · ~45 min, 5 · ~40 min, 8 · ~30 min). Set labels are honest
// rep prescriptions until logged history provides a real top set to aim at.
export const TEMPLATES: Record<string, { name: string; sets: string[] }[]> = {
  'Upper body': [
    { name: 'Bench press', sets: ['8 reps', '8 reps', '8 reps'] },
    { name: 'Incline dumbbell press', sets: ['10 reps', '10 reps', '10 reps'] },
    { name: 'Overhead press', sets: ['8 reps', '8 reps', '8 reps'] },
    { name: 'Lat pulldown', sets: ['10 reps', '10 reps', '10 reps'] },
    { name: 'Seated row', sets: ['10 reps', '10 reps', '10 reps'] },
    { name: 'Triceps pushdown', sets: ['12 reps', '12 reps', '12 reps'] },
  ],
  'Lower body': [
    { name: 'Squat', sets: ['8 reps', '8 reps', '8 reps'] },
    { name: 'Romanian deadlift', sets: ['10 reps', '10 reps', '10 reps'] },
    { name: 'Leg press', sets: ['10 reps', '10 reps', '10 reps'] },
    { name: 'Leg curl', sets: ['12 reps', '12 reps', '12 reps'] },
    { name: 'Standing calf raise', sets: ['15 reps', '15 reps', '15 reps'] },
  ],
  'Full body 30': [
    { name: 'Goblet squat', sets: ['12 reps', '12 reps'] },
    { name: 'Push-up', sets: ['12 reps', '12 reps'] },
    { name: 'Dumbbell row', sets: ['10 reps', '10 reps'] },
    { name: 'Overhead press', sets: ['10 reps', '10 reps'] },
    { name: 'Romanian deadlift', sets: ['10 reps', '10 reps'] },
    { name: 'Lunge', sets: ['10 reps', '10 reps'] },
    { name: 'Plank', sets: ['40 sec', '40 sec'] },
    { name: 'Farmer carry', sets: ['30 sec', '30 sec'] },
  ],
};

const EMPTY_PLAN = [{ name: 'Freestyle', sets: ['Work set', 'Work set', 'Work set'] }];

function buildExercises(name: string): SessionExercise[] {
  const plan = TEMPLATES[name] ?? EMPTY_PLAN;
  const entries = core.useLogs.getState().entries;
  return plan.map((ex) => {
    const top = lastTopSet(entries, ex.name);
    return { name: ex.name, sets: ex.sets.map((label) => ({ label: top ?? label, done: false })) };
  });
}

// Persisted so a live session survives reloads and crashes ("sessions save
// set-by-set locally"). The timer derives from startTs, so elapsed time stays
// correct across a relaunch.
export const useSession = create<SessionState>()(
  persist(
    (set, get) => ({
      active: false,
      startTs: 0,
      name: '',
      exercises: [],
      exIndex: 0,
      start: (name) =>
        set({ active: true, startTs: Date.now(), name, exIndex: 0, exercises: buildExercises(name) }),
      toggleSet: (index) =>
        set((s) => ({
          exercises: s.exercises.map((ex, ei) =>
            ei === s.exIndex
              ? { ...ex, sets: ex.sets.map((x, i) => (i === index ? { ...x, done: !x.done } : x)) }
              : ex,
          ),
        })),
      addSet: () =>
        set((s) => ({
          exercises: s.exercises.map((ex, ei) =>
            ei === s.exIndex
              ? {
                  ...ex,
                  sets: [
                    ...ex.sets,
                    { label: ex.sets[ex.sets.length - 1]?.label ?? 'Work set', done: false },
                  ],
                }
              : ex,
          ),
        })),
      nextExercise: () =>
        set((s) => ({ exIndex: Math.min(s.exIndex + 1, Math.max(0, s.exercises.length - 1)) })),
      discard: () => set({ active: false, startTs: 0, exercises: [], exIndex: 0 }),
      finish: () => {
        const { startTs, name, exercises } = get();
        const mins = Math.max(1, Math.round((Date.now() - startTs) / 60000));
        const done = summarizeSession(exercises);
        logActivity({
          tracker: 'workouts',
          source: 'session',
          data: {
            kind: 'workout',
            name,
            mins,
            ...(done.length > 0 ? { exercises: done } : {}),
          },
          title: 'Workout logged',
        });
        set({ active: false, startTs: 0, exercises: [], exIndex: 0 });
      },
    }),
    {
      name: 'streka-session',
      storage: createJSONStorage(() => kvStorage),
      // A rehydrated "live" session must have a sane start time and the
      // multi-exercise shape; anything invalid, pre-rework, or older than a
      // day is an orphan, not a workout in progress.
      onRehydrateStorage: () => (state) => {
        if (!state?.active) return;
        const stale =
          !state.startTs ||
          state.startTs <= 0 ||
          Date.now() - state.startTs > 24 * 3_600_000 ||
          !Array.isArray(state.exercises) ||
          state.exercises.length === 0;
        if (stale)
          useSession.setState({ active: false, startTs: 0, name: '', exercises: [], exIndex: 0 });
      },
    },
  ),
);
