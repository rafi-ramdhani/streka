import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { logActivity } from '../core';
import { kvStorage } from '../db';

// GPS run state machine (Proto logic 88-102, 272-291): primer shows once,
// live tracking with pause bookkeeping, then a summary that logs on save.

function fmtSec(el: number): string {
  const m = Math.floor(el / 60);
  const s = Math.floor(el % 60);
  return `${m}:${String(s).padStart(2, '0')}`;
}

interface GpsRunState {
  primed: boolean;
  mode: 'primer' | 'live' | 'summary' | null;
  startTs: number;
  pausedTotal: number;
  pauseStart: number;
  paused: boolean;
  autoPaused: boolean;
  distanceKm: number;
  points: [number, number][];
  sumKm: number;
  sumSec: number;
  sumTime: string;
  sumPace: string;
  open: () => void;
  prime: () => void;
  begin: () => void;
  togglePause: () => void;
  setAutoPaused: (paused: boolean) => void;
  addDistance: (km: number) => void;
  addPoint: (lat: number, lng: number) => void;
  elapsedSec: () => number;
  end: () => void;
  save: () => void;
  close: () => void;
}

// Only the permission-primer flag persists; a live run does not survive a
// process kill until the background-location module lands (TAD 5.2).
export const useGpsRun = create<GpsRunState>()(
  persist(
    (set, get) => ({
  primed: false,
  mode: null,
  startTs: 0,
  pausedTotal: 0,
  pauseStart: 0,
  paused: false,
  autoPaused: false,
  distanceKm: 0,
  points: [],
  sumKm: 0,
  sumSec: 0,
  sumTime: '',
  sumPace: '',
  open: () => set({ mode: get().primed ? 'live' : 'primer' }),
  prime: () => set({ primed: true }),
  begin: () =>
    set({
      mode: 'live',
      startTs: Date.now(),
      pausedTotal: 0,
      paused: false,
      autoPaused: false,
      distanceKm: 0,
      points: [],
    }),
  togglePause: () => {
    const s = get();
    if (s.paused) {
      set({ paused: false, autoPaused: false, pausedTotal: s.pausedTotal + (Date.now() - s.pauseStart) });
    } else {
      set({ paused: true, autoPaused: false, pauseStart: Date.now() });
    }
  },
  setAutoPaused: (paused) => {
    const s = get();
    if (paused && !s.paused) set({ paused: true, autoPaused: true, pauseStart: Date.now() });
    if (!paused && s.paused && s.autoPaused) {
      set({ paused: false, autoPaused: false, pausedTotal: s.pausedTotal + (Date.now() - s.pauseStart) });
    }
  },
  addDistance: (km) => {
    if (!get().paused) set((s) => ({ distanceKm: s.distanceKm + km }));
  },
  addPoint: (lat, lng) => {
    if (get().paused) return;
    // ~1 m precision keeps the payload compact.
    const pt: [number, number] = [Number(lat.toFixed(5)), Number(lng.toFixed(5))];
    set((s) => ({ points: [...s.points, pt] }));
  },
  elapsedSec: () => {
    const s = get();
    if (s.mode !== 'live') return 0;
    const pausedExtra = s.paused ? Date.now() - s.pauseStart : 0;
    return Math.max(0, (Date.now() - s.startTs - s.pausedTotal - pausedExtra) / 1000);
  },
  end: () => {
    const s = get();
    const el = s.elapsedSec();
    const km = Math.max(0.1, Math.round(s.distanceKm * 100) / 100);
    const paceSec = km > 0 ? el / km : 0;
    set({
      mode: 'summary',
      sumKm: km,
      sumSec: el,
      sumTime: fmtSec(el),
      sumPace: paceSec > 0 ? fmtSec(paceSec) : '—',
    });
  },
  save: () => {
    const s = get();
    // Decimate long routes; ~500 points is plenty for a route render.
    const step = Math.max(1, Math.ceil(s.points.length / 500));
    const route = s.points.filter((_, i) => i % step === 0 || i === s.points.length - 1);
    logActivity({
      tracker: 'running',
      source: 'gps',
      data: {
        kind: 'run',
        km: s.sumKm,
        time: s.sumTime,
        pace: s.sumPace,
        ...(route.length > 1 ? { route } : {}),
      },
      title: `Run logged · ${s.sumKm.toFixed(2)} km`,
    });
    set({ mode: null });
  },
  close: () => set({ mode: null }),
    }),
    {
      name: 'streka-gpsrun',
      storage: createJSONStorage(() => kvStorage),
      partialize: (s) => ({ primed: s.primed }) as GpsRunState,
    },
  ),
);
