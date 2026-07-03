import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import type { TrackerId } from '@streka/core';
import { kvStorage } from '../db';

// The board renders tiles in this order (filtered by which trackers are
// picked). Kept out of core Settings so the schema and seed stay untouched;
// it is a pure device preference. Reordered from Settings via drag and drop.
export const DEFAULT_TILE_ORDER: TrackerId[] = [
  'steps',
  'workouts',
  'meals',
  'running',
  'weight',
  'swimming',
  'classes',
  'sleep',
];

interface TileOrderState {
  order: TrackerId[];
  setOrder: (order: TrackerId[]) => void;
}

// Merge helper: keep the saved order, drop anything unknown, and append any
// tracker missing from the saved list (e.g. a new tracker in a later build) so
// the board never silently hides a tile.
export function normalizeOrder(saved: TrackerId[]): TrackerId[] {
  const known = new Set(DEFAULT_TILE_ORDER);
  const kept = saved.filter((t) => known.has(t));
  const seen = new Set(kept);
  return [...kept, ...DEFAULT_TILE_ORDER.filter((t) => !seen.has(t))];
}

export const useTileOrder = create<TileOrderState>()(
  persist(
    (set) => ({
      order: DEFAULT_TILE_ORDER,
      setOrder: (order) => set({ order: normalizeOrder(order) }),
    }),
    {
      name: 'streka-tile-order',
      storage: createJSONStorage(() => kvStorage),
      onRehydrateStorage: () => (state) => {
        if (state) state.order = normalizeOrder(state.order);
      },
    },
  ),
);
