import { create } from 'zustand';
import { dayOf, seedDemo, type TrackerId } from '@streka/core';
import { core } from '../core';

// Draft choices collected across the onboarding screens; applied to the
// persisted settings only on completion (Proto logic: enterApp / returning).

export const TRACKER_OPTIONS: { id: TrackerId; name: string }[] = [
  { id: 'workouts', name: 'Workouts' },
  { id: 'running', name: 'Running' },
  { id: 'meals', name: 'Meals' },
  { id: 'swimming', name: 'Swimming' },
  { id: 'weight', name: 'Weight' },
  { id: 'classes', name: 'Classes' },
  { id: 'sleep', name: 'Sleep' },
  { id: 'steps', name: 'Steps' },
];

interface OnboardingState {
  picked: Record<TrackerId, boolean>;
  rhythmDays: 2 | 3 | 4 | 5 | 6;
  nudgeEnabled: boolean;
  healthConnected: boolean;
  coachPending: boolean;
  toggle: (id: TrackerId) => void;
  setRhythm: (d: 2 | 3 | 4 | 5 | 6) => void;
  toggleNudge: () => void;
  setHealth: (on: boolean) => void;
  dismissCoach: () => void;
}

export const useOnboarding = create<OnboardingState>((set) => ({
  picked: {
    workouts: true,
    running: true,
    meals: true,
    swimming: false,
    weight: true,
    classes: false,
    sleep: false,
    steps: true,
  },
  rhythmDays: 3,
  nudgeEnabled: true,
  healthConnected: false,
  coachPending: false,
  toggle: (id) => set((s) => ({ picked: { ...s.picked, [id]: !s.picked[id] } })),
  setRhythm: (rhythmDays) => set({ rhythmDays }),
  toggleNudge: () => set((s) => ({ nudgeEnabled: !s.nudgeEnabled })),
  setHealth: (healthConnected) => set({ healthConnected }),
  dismissCoach: () => set({ coachPending: false }),
}));

// Fresh finish: picked trackers literally build the Board; coach mark shows once.
export function enterApp(hasAccount: boolean) {
  const d = useOnboarding.getState();
  core.useSettings.getState().set({
    onboarded: true,
    hasAccount,
    picked: d.picked,
    rhythmDays: d.rhythmDays,
    nudge: { enabled: d.nudgeEnabled, time: '17:30' },
    healthConnected: d.healthConnected,
  });
  core.useSync.getState().setOnline(hasAccount);
  useOnboarding.setState({ coachPending: true });
}

// "I already have an account": mock sign-in straight into the day-12 demo
// dataset (auth screens are an undesigned open item).
export function enterAsReturning() {
  const { entries, settings } = seedDemo(dayOf(Date.now()));
  core.useLogs.setState({ entries });
  core.useSettings.getState().set(settings);
  core.useSync.getState().setOnline(true);
  useOnboarding.setState({ coachPending: false });
}
