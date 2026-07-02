import { create } from 'zustand';
import { createJSONStorage, persist, type StateStorage } from 'zustand/middleware';
import { dayOf } from './days';
import type { LogRepo } from './repo';
import { intentionalDays, isFirstLogOfDay, streak } from './streak';
import { toastSub } from './toast';
import type { LogData, LogEntry, LogSource, Settings, TrackerId } from './types';
import { DEFAULT_SETTINGS } from './types';

export interface CoreOptions {
  storage: StateStorage;
  now?: () => number;
  id?: () => string;
  // When provided, log entries live in the repo (SQLite on mobile) and the
  // zustand store is a hydrated in-memory cache with write-through.
  logRepo?: LogRepo;
}

export interface SettingsState extends Settings {
  set: (patch: Partial<Settings>) => void;
}

export interface LogsState {
  entries: LogEntry[];
  hydrated: boolean;
  append: (entry: LogEntry) => void;
  tombstone: (id: string) => void;
  replaceAll: (entries: LogEntry[]) => void;
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

  const repo = opts.logRepo;
  const persistWrite = (write: Promise<void>) => {
    void write.catch((err) => console.warn('streka: log persistence failed', err));
  };

  const logsInit = (set: (fn: (s: LogsState) => Partial<LogsState>) => void): LogsState => ({
    entries: [],
    hydrated: false,
    append: (entry) => {
      set((s) => ({ entries: [...s.entries, entry] }));
      if (repo) persistWrite(repo.insert(entry, now()));
    },
    tombstone: (id) => {
      set((s) => ({
        entries: s.entries.map((e) => (e.id === id ? { ...e, deleted: true } : e)),
      }));
      if (repo) persistWrite(repo.tombstone(id, now()));
    },
    replaceAll: (entries) => {
      set(() => ({ entries }));
      if (repo) persistWrite(repo.replaceAll(entries, now()));
    },
  });

  const useLogs = repo
    ? create<LogsState>()(logsInit)
    : create<LogsState>()(
        persist(logsInit, {
          name: 'streka-logs',
          storage,
          partialize: (s) => ({ entries: s.entries }) as LogsState,
        }),
      );

  // Settings rehydrate through async storage on their own schedule; a write
  // made before that lands gets clobbered by it. Callers gate the app on
  // hydrate(), so hydrate() must cover settings too. The timeout keeps a
  // broken storage from holding the splash screen forever.
  const settingsReady = () =>
    new Promise<void>((resolve) => {
      if (useSettings.persist.hasHydrated()) return resolve();
      const timer = setTimeout(resolve, 3000);
      useSettings.persist.onFinishHydration(() => {
        clearTimeout(timer);
        resolve();
      });
    });

  // Load persisted entries into the in-memory cache. Without a repo the
  // persist middleware already rehydrated synchronously; just flip the flag.
  const hydrate = async () => {
    await settingsReady();
    if (repo) {
      await repo.init();
      const entries = await repo.all();
      useLogs.setState({ entries, hydrated: true });
    } else {
      useLogs.setState({ hydrated: true });
    }
  };

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

  return { useSettings, useLogs, useSync, useToast, showToast, logActivity, hydrate };
}
