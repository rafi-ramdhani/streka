import { create } from 'zustand';
import { createJSONStorage, persist, type StateStorage } from 'zustand/middleware';
import { dayOf } from './days';
import { intentionalDays, isFirstLogOfDay, streak } from './streak';
import { toastSub } from './toast';
import type { LogData, LogEntry, LogSource, Settings, TrackerId } from './types';
import { DEFAULT_SETTINGS } from './types';

export interface CoreOptions {
  storage: StateStorage;
  now?: () => number;
  id?: () => string;
}

export interface SettingsState extends Settings {
  set: (patch: Partial<Settings>) => void;
}

export interface LogsState {
  entries: LogEntry[];
  append: (entry: LogEntry) => void;
  tombstone: (id: string) => void;
}

export interface SyncState {
  online: boolean;
  setOnline: (online: boolean) => void;
}

export interface ToastState {
  toast: { title: string; sub: string } | null;
}

export interface LogInput {
  tracker: TrackerId;
  source: LogSource;
  data: LogData;
  title: string;
}

function defaultId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return crypto.randomUUID();
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 12)}`;
}

export type Core = ReturnType<typeof createCore>;

export function createCore(opts: CoreOptions) {
  const now = opts.now ?? Date.now;
  const genId = opts.id ?? defaultId;
  const storage = createJSONStorage(() => opts.storage);

  const useSettings = create<SettingsState>()(
    persist(
      (set) => ({
        ...DEFAULT_SETTINGS,
        set: (patch) => set(patch),
      }),
      { name: 'streka-settings', storage },
    ),
  );

  const useLogs = create<LogsState>()(
    persist(
      (set) => ({
        entries: [],
        append: (entry) => set((s) => ({ entries: [...s.entries, entry] })),
        tombstone: (id) =>
          set((s) => ({
            entries: s.entries.map((e) => (e.id === id ? { ...e, deleted: true } : e)),
          })),
      }),
      { name: 'streka-logs', storage },
    ),
  );

  // Online state is runtime-only; account membership lives in settings.
  const useSync = create<SyncState>((set) => ({
    online: true,
    setOnline: (online) => set({ online }),
  }));

  const useToast = create<ToastState>(() => ({ toast: null }));
  let toastTimer: ReturnType<typeof setTimeout> | undefined;
  const showToast = (title: string, sub: string) => {
    clearTimeout(toastTimer);
    useToast.setState({ toast: { title, sub } });
    toastTimer = setTimeout(() => useToast.setState({ toast: null }), 2800);
  };

  // The one write path for intentional logs: derives streak state before the
  // append so the first log of the day fires the streak toast (prototype flow).
  const logActivity = (input: LogInput) => {
    const ts = now();
    const day = dayOf(ts);
    const entries = useLogs.getState().entries;
    const firstLog = isFirstLogOfDay(entries, day);
    const days = intentionalDays(entries);
    days.add(day);
    const streakN = streak(days, day);

    useLogs.getState().append({
      id: genId(),
      ts,
      day,
      tracker: input.tracker,
      source: input.source,
      data: input.data,
    });

    const account = useSettings.getState().hasAccount;
    const online = useSync.getState().online;
    showToast(input.title, toastSub({ account, online, firstLog, streakN }));
  };

  return { useSettings, useLogs, useSync, useToast, showToast, logActivity };
}
