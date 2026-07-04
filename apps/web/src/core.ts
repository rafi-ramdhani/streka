import { createCore } from '@streka/core';

// Web talks to the account API (POST /sync). The store is an in-memory cache
// hydrated from the server on mount, never persisted to localStorage: a
// per-tab Map keeps one account's data from leaking into another account's
// session on a shared browser.
const memory = new Map<string, string>();
const memStorage = {
  getItem: (k: string) => memory.get(k) ?? null,
  setItem: (k: string, v: string) => {
    memory.set(k, v);
  },
  removeItem: (k: string) => {
    memory.delete(k);
  },
};

export const core = createCore({ storage: memStorage });

// Honest toast copy: web writes go to the account, not "your phone".
export function webToast(title: string) {
  core.showToast(title, 'Saved to your account');
}

export function webToastError() {
  core.showToast('Could not save', 'Check your connection and try again');
}

export const { useSettings, useLogs, useToast } = core;
