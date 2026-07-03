import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { kvStorage } from '../db';

// User-defined workouts: a name and an ordered list of exercise names. They
// sit alongside the built-in templates in the workout sheet and feed the live
// session the same way (each exercise starts at 3 work sets, upgraded to the
// user's last top set as history builds, exactly like a template).
export interface CustomWorkout {
  id: string;
  name: string;
  exercises: string[];
}

interface CustomWorkoutsState {
  workouts: CustomWorkout[];
  add: (name: string, exercises: string[]) => void;
  remove: (id: string) => void;
}

function uid(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

export const useCustomWorkouts = create<CustomWorkoutsState>()(
  persist(
    (set) => ({
      workouts: [],
      add: (name, exercises) =>
        set((s) => ({ workouts: [...s.workouts, { id: uid(), name, exercises }] })),
      remove: (id) => set((s) => ({ workouts: s.workouts.filter((w) => w.id !== id) })),
    }),
    { name: 'streka-custom-workouts', storage: createJSONStorage(() => kvStorage) },
  ),
);
