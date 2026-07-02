import { create } from 'zustand';
import { scanTotal, type Ingredient, type Portion, type ScanResult } from '@streka/core';
import { logActivity } from '../core';
import { scanService } from '../core';

// Food scan state machine (Proto logic 293-338). The mock scan service
// alternates high/low confidence; low-confidence results are never auto-logged.

interface FoodScanState {
  mode: 'camera' | 'analyzing' | 'result' | 'unsure' | null;
  result: ScanResult | null;
  // Captured or picked photo shown on the result screens; never persisted.
  photoUri: string | null;
  portion: Portion;
  removed: boolean[];
  extras: Ingredient[];
  openCamera: () => void;
  takePhoto: (photoUri?: string) => Promise<void>;
  retake: () => void;
  setPortion: (p: Portion) => void;
  toggleIngredient: (index: number) => void;
  addIngredient: () => void;
  ingredients: () => Ingredient[];
  total: () => number;
  logResult: () => void;
  logMatch: (name: string, kcal: number) => void;
  close: () => void;
}

export const useFoodScan = create<FoodScanState>((set, get) => ({
  mode: null,
  result: null,
  photoUri: null,
  portion: 'm',
  removed: [],
  extras: [],
  openCamera: () => set({ mode: 'camera', photoUri: null, portion: 'm', removed: [], extras: [] }),
  takePhoto: async (photoUri) => {
    set({ mode: 'analyzing', photoUri: photoUri ?? null });
    const result = await scanService.analyze();
    set({
      result,
      removed: result.ingredients.map(() => false),
      extras: [],
      portion: 'm',
      mode: result.confidence === 'high' ? 'result' : 'unsure',
    });
  },
  retake: () => set({ mode: 'camera', photoUri: null }),
  setPortion: (portion) => set({ portion }),
  toggleIngredient: (index) =>
    set((s) => ({ removed: s.removed.map((r, i) => (i === index ? !r : r)) })),
  addIngredient: () =>
    set((s) => ({
      extras: [...s.extras, { name: 'Extra item', kcal: 60 }],
      removed: [...s.removed, false],
    })),
  ingredients: () => {
    const s = get();
    return [...(s.result?.ingredients ?? []), ...s.extras];
  },
  total: () => {
    const s = get();
    return scanTotal(s.ingredients(), s.removed, s.portion);
  },
  logResult: () => {
    const s = get();
    const total = s.total();
    logActivity({
      tracker: 'meals',
      source: 'scan',
      data: { kind: 'meal', kcal: total, label: s.result?.dish, scanned: true },
      title: `Meal logged · ~${total} kcal · scanned`,
    });
    set({ mode: null, result: null, photoUri: null });
  },
  logMatch: (name, kcal) => {
    logActivity({
      tracker: 'meals',
      source: 'scan',
      data: { kind: 'meal', kcal, label: name, scanned: true },
      title: `Meal logged · ~${kcal} kcal · ${name}`,
    });
    set({ mode: null, result: null, photoUri: null });
  },
  close: () => set({ mode: null, result: null, photoUri: null }),
}));
