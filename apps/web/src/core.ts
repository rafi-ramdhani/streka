import { createCore, dayOf, seedDemo } from '@streka/core';

// Web is always-online by framing (handoff): no offline states anywhere.
// With the backend mocked there is no real cross-device sync, so first run
// seeds the same day-12 demo dataset the web prototype presents, including
// this morning's phone run and today's meals.
export const core = createCore({
  storage: {
    getItem: (k) => localStorage.getItem(k),
    setItem: (k, v) => localStorage.setItem(k, v),
    removeItem: (k) => localStorage.removeItem(k),
  },
});

const SEED_FLAG = 'streka-web-seeded';

export function ensureSeeded() {
  if (localStorage.getItem(SEED_FLAG)) return;
  const today = dayOf(Date.now());
  const { entries, settings } = seedDemo(today);
  const morning = Date.parse(`${today}T07:04:00`);
  entries.push(
    {
      id: 'seed-today-run',
      ts: morning,
      day: today,
      tracker: 'running',
      source: 'gps',
      data: { kind: 'run', km: 4.2, time: '26:41', pace: '6:20' },
    },
    {
      id: 'seed-today-meal-1',
      ts: Date.parse(`${today}T08:10:00`),
      day: today,
      tracker: 'meals',
      source: 'manual',
      data: { kind: 'meal', kcal: 880 },
    },
    {
      id: 'seed-today-meal-2',
      ts: Date.parse(`${today}T12:30:00`),
      day: today,
      tracker: 'meals',
      source: 'manual',
      data: { kind: 'meal', kcal: 550 },
    },
  );
  core.useLogs.getState().replaceAll(entries);
  core.useSettings.getState().set(settings);
  localStorage.setItem(SEED_FLAG, 'yes');
}

// Web toast wording is fixed (Web logic 22-26).
export function webToast(title: string) {
  core.showToast(title, 'Synced · visible on your phone in a moment');
}

export const { useSettings, useLogs, useToast } = core;
