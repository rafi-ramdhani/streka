# S4b Dashboard on Live Sync Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Turn the `/app` route into the real Board/Trends/Goals dashboard, driven by the live `POST /sync` API instead of the localStorage demo, and strip every fabricated metric.

**Architecture:** A thin, online-only sync client (`src/sync.ts`) pulls a full snapshot from cursor 0 on mount and pushes each write, mapping between the core `LogEntry` shape and the server wire shape. The web core store becomes an ephemeral in-memory cache (no localStorage, no `seedDemo`). The retained `src/*` dashboard is edited in place: honest empty states, no steps/sleep/iPhone/JT/demo fabrications, wired into the S4a-guarded App Router route.

**Tech Stack:** Next.js 15 App Router, React 19, zustand (via `@streka/core`), vitest + @testing-library/react (jsdom), the S3 `POST /sync` endpoint (unchanged).

## Global Constraints

- **No em dashes** (`—`, U+2014) anywhere: prose, code comments, UI copy, commit messages. Use commas, periods, parentheses, or a hyphen `-`. (The ASCII hyphen `-` and the math minus `−` in the weight stepper are fine.)
- **No AI attribution** in commit messages (no "Co-Authored-By", no "Generated with").
- **Never modify `apps/mobile` or `packages/core`.** Consume `@streka/core` only; import its values/types, never edit it.
- **Never modify `apps/server`.** No route, schema, cookie, or CORS change. The wire contract is fixed by S3.
- **Work on the `staging` branch.** Never merge `staging` into `main`.
- **pnpm only** (never Bun); Node runtime.
- **Type-only imports from `@streka/core`** for types (`import { dayOf, type LogEntry } from '@streka/core'`).
- **Honest & lean:** no fabricated metrics. Removed for good: steps ring, sleep tile, `"Synced · iPhone just now"` status, `JT` avatar, `seedDemo`/`ensureSeeded`, Goals' `"70,000 steps a week / auto from watch"` card, Goals' `"Reach 70 kg"` weight-target card. Empty accounts show honest empty states.
- **Sync client:** online-only (no offline outbox/retry). Pull the full snapshot from cursor 0 on every mount; keep the cursor only in an in-memory module variable. Settings sync as one row under key `settings` (value = the whole `Settings` object). `updatedAt` is `Date.now()` at push time.
- **Store is ephemeral in-memory** (a `Map`-backed `StateStorage`), never localStorage; the server is the authority.
- **`@streka/core` joins `transpilePackages`** in `next.config.ts` (it ships raw TS and is now bundled by the route).
- **fetch shape:** `POST /api/sync`, `credentials: 'same-origin'`, `headers: { 'content-type': 'application/json' }`, JSON body. Mirrors the S4a `AuthForm`.

## File Structure

Files created or modified, grouped by responsibility:

- **Data layer**
  - `apps/web/src/core.ts` (modify) - ephemeral in-memory store, drop the demo seed, honest toast copy (`webToast`, `webToastError`).
  - `apps/web/src/sync.ts` (create) - the sync engine: `toWire`, `fromWire`, `pullAll`, `pushEntry`, `pushSettings`, in-memory cursor.
  - `apps/web/src/lib.ts` (modify) - `logFromWeb` pushes entries; new `updateSettings` pushes settings.
- **Route shell**
  - `apps/web/src/Dashboard.tsx` (create, replacing `src/App.tsx`) - de-faked header (email + sign-out), mount pull, loading/error gate, nav + section switch.
  - `apps/web/src/App.tsx` (delete), `apps/web/src/App.test.tsx` (delete - it asserts the old demo shell).
  - `apps/web/app/app/page.tsx` (modify) - render `<Dashboard />`.
  - `apps/web/next.config.ts` (modify) - add `@streka/core` to `transpilePackages`.
  - `apps/web/app/globals.css` (modify) - add the `@keyframes toastIn` the Toast needs.
  - `apps/web/src/index.css` (delete - orphaned since S4a removed the Vite entry).
- **Sections (honest-lean edits)**
  - `apps/web/src/sections/Board.tsx` (modify) - remove steps hero + sleep tile, `-` placeholders, honest subs, fix em dashes.
  - `apps/web/src/sections/Trends.tsx` (modify) - remove the steps stat + seed, honest empty weight.
  - `apps/web/src/sections/Goals.tsx` (modify) - remove steps + weight-target cards, nudge toggle via `updateSettings`.
  - `apps/web/src/components/bits.tsx` (modify) - `Toggle` gets `role="switch"` + `aria-checked` (a11y + testability).

Tests live next to their source: `src/core.test.ts`, `src/sync.test.ts`, `src/lib.test.ts`, `src/Dashboard.test.tsx`, `src/sections/{Board,Trends,Goals}.test.tsx`.

---

### Task 1: Ephemeral core store, no demo seed, honest toasts

**Files:**
- Modify: `apps/web/src/core.ts` (full rewrite, ~35 lines)
- Delete: `apps/web/src/App.test.tsx` (it imports `ensureSeeded`, removed here, and asserts the seeded demo board)
- Test: `apps/web/src/core.test.ts` (create)

**Interfaces:**
- Consumes: `createCore` from `@streka/core` (signature `createCore({ storage })` returning `{ useSettings, useLogs, useToast, showToast, ... }`).
- Produces: `core` (the created core), `useSettings`, `useLogs`, `useToast` (re-exports), `webToast(title: string): void`, `webToastError(): void`.

- [ ] **Step 1: Write the failing test**

Create `apps/web/src/core.test.ts`:

```ts
import { beforeEach, describe, expect, it } from 'vitest';
import { core, webToast, webToastError } from './core';

beforeEach(() => {
  localStorage.clear();
  core.useLogs.setState({ entries: [] });
});

describe('web core', () => {
  it('webToast uses honest account copy, not phone copy', () => {
    webToast('Meal logged');
    const toast = core.useToast.getState().toast;
    expect(toast?.title).toBe('Meal logged');
    expect(toast?.sub).toBe('Saved to your account');
  });

  it('webToastError surfaces an honest failure', () => {
    webToastError();
    expect(core.useToast.getState().toast?.title).toBe('Could not save');
  });

  it('log writes stay in memory, never localStorage', () => {
    core.useLogs.getState().append({
      id: 'x',
      ts: 1,
      day: '2026-07-04',
      tracker: 'meals',
      source: 'manual',
      data: { kind: 'meal', kcal: 550 },
    });
    expect(core.useLogs.getState().entries).toHaveLength(1);
    expect(localStorage.length).toBe(0);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `pnpm --filter web test src/core.test.ts`
Expected: FAIL - the current `core.ts` uses `localStorage` (so `localStorage.length` is not 0) and `webToast` sub is the old phone copy.

- [ ] **Step 3: Rewrite `apps/web/src/core.ts`**

Replace the entire file with:

```ts
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
```

- [ ] **Step 4: Delete the demo-shell test that depends on the seed**

`App.test.tsx` imports `ensureSeeded` (now gone) and asserts the seeded day-12 board, which no longer exists. Remove it so the tree stays green (the dashboard gets its own test in Task 4):

```bash
git rm apps/web/src/App.test.tsx
```

(Leave `src/App.tsx` in place for now; it is orphaned but still compiles, and Task 4 replaces it with `Dashboard.tsx`.)

- [ ] **Step 5: Run the test to verify it passes**

Run: `pnpm --filter web test`
Expected: PASS - `core.test.ts` green; no import error from the deleted `App.test.tsx`.

- [ ] **Step 6: Commit**

```bash
git add apps/web/src/core.ts apps/web/src/core.test.ts apps/web/src/App.test.tsx
git commit -m "feat(web): make the web store ephemeral and drop the demo seed"
```

---

### Task 2: Sync engine

**Files:**
- Create: `apps/web/src/sync.ts`
- Test: `apps/web/src/sync.test.ts`

**Interfaces:**
- Consumes: `core` from `./core` (uses `core.useLogs` / `core.useSettings`); `type { LogData, LogEntry, LogSource, Settings, TrackerId }` from `@streka/core`. The store's `LogsState.replaceAll(entries)` and `SettingsState.set(patch)` methods.
- Produces:
  - `toWire(entry: LogEntry): WireEntry`
  - `fromWire(w: WireEntry): LogEntry`
  - `pullAll(): Promise<void>` - resets cursor to 0, clears entries, loops the pull until `hasMore` is false.
  - `pushEntry(entry: LogEntry): Promise<void>`
  - `pushSettings(settings: Settings): Promise<void>`
  - `WireEntry` = `{ id, ts, day, tracker, source, kind, payload, deleted, updatedAt }`; server response `{ cursor, entries: WireEntry[], settings: { key, value, updatedAt }[], hasMore }`.

- [ ] **Step 1: Write the failing test**

Create `apps/web/src/sync.test.ts`:

```ts
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { core } from './core';
import { pullAll, pushEntry, pushSettings, toWire } from './sync';

function wireMeal(id: string, kcal: number) {
  return {
    id,
    ts: 1,
    day: '2026-07-04',
    tracker: 'meals',
    source: 'manual',
    kind: 'meal',
    payload: { kind: 'meal', kcal },
    deleted: false,
    updatedAt: 1,
  };
}

function ok(body: unknown) {
  return { ok: true, json: async () => body };
}

function lastBody(mock: ReturnType<typeof vi.fn>) {
  const call = mock.mock.calls[mock.mock.calls.length - 1];
  return JSON.parse(call[1].body);
}

beforeEach(() => {
  core.useLogs.setState({ entries: [] });
});
afterEach(() => {
  vi.unstubAllGlobals();
});

describe('sync engine', () => {
  it('pullAll posts cursor 0 with empty batches and hydrates the store', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(ok({ cursor: 3, entries: [wireMeal('a', 550)], settings: [], hasMore: false }));
    vi.stubGlobal('fetch', fetchMock);

    await pullAll();

    expect(fetchMock).toHaveBeenCalledWith('/api/sync', expect.objectContaining({ method: 'POST' }));
    const body = JSON.parse(fetchMock.mock.calls[0][1].body);
    expect(body).toEqual({ cursor: 0, entries: [], settings: [] });
    expect(core.useLogs.getState().entries).toHaveLength(1);
    expect(core.useLogs.getState().entries[0].data).toEqual({ kind: 'meal', kcal: 550 });
  });

  it('pullAll follows hasMore with the advancing cursor', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(ok({ cursor: 1, entries: [wireMeal('a', 550)], settings: [], hasMore: true }))
      .mockResolvedValueOnce(ok({ cursor: 2, entries: [wireMeal('b', 800)], settings: [], hasMore: false }));
    vi.stubGlobal('fetch', fetchMock);

    await pullAll();

    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(JSON.parse(fetchMock.mock.calls[1][1].body).cursor).toBe(1);
    expect(core.useLogs.getState().entries).toHaveLength(2);
  });

  it('pushEntry sends the wire shape and the current cursor', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(ok({ cursor: 5, entries: [], settings: [], hasMore: false }))
      .mockResolvedValueOnce(ok({ cursor: 6, entries: [], settings: [], hasMore: false }));
    vi.stubGlobal('fetch', fetchMock);
    await pullAll(); // sets cursor to 5

    await pushEntry({
      id: 'z',
      ts: 10,
      day: '2026-07-04',
      tracker: 'meals',
      source: 'manual',
      data: { kind: 'meal', kcal: 300 },
    });

    const body = lastBody(fetchMock);
    expect(body.cursor).toBe(5);
    expect(body.entries[0]).toMatchObject({
      id: 'z',
      kind: 'meal',
      payload: { kind: 'meal', kcal: 300 },
      deleted: false,
    });
    expect(typeof body.entries[0].updatedAt).toBe('number');
  });

  it('pushSettings sends one settings row', async () => {
    const fetchMock = vi.fn().mockResolvedValueOnce(ok({ cursor: 1, entries: [], settings: [], hasMore: false }));
    vi.stubGlobal('fetch', fetchMock);

    await pushSettings({
      onboarded: false,
      picked: {
        steps: true,
        workouts: true,
        meals: true,
        running: true,
        weight: true,
        swimming: false,
        classes: false,
        sleep: false,
      },
      rhythmDays: 3,
      nudge: { enabled: false, time: '17:30' },
      hasAccount: true,
      units: 'metric',
      kcalGoal: 2200,
      stepsGoalDay: 11500,
      stepsGoalWeek: 70000,
    });

    const body = lastBody(fetchMock);
    expect(body.settings).toHaveLength(1);
    expect(body.settings[0].key).toBe('settings');
    expect(body.settings[0].value.rhythmDays).toBe(3);
    expect(body.settings[0].value.nudge.enabled).toBe(false);
  });

  it('upserts pulled entries by id (later wins)', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(ok({ cursor: 1, entries: [wireMeal('a', 550)], settings: [], hasMore: false }))
      .mockResolvedValueOnce(ok({ cursor: 2, entries: [], settings: [], hasMore: false }))
      .mockResolvedValueOnce(ok({ cursor: 3, entries: [wireMeal('a', 800)], settings: [], hasMore: false }));
    vi.stubGlobal('fetch', fetchMock);

    await pullAll(); // entry a = 550, cursor 1
    await pushEntry({
      id: 'a',
      ts: 1,
      day: '2026-07-04',
      tracker: 'meals',
      source: 'manual',
      data: { kind: 'meal', kcal: 800 },
    }); // server echoes a = 800

    const entries = core.useLogs.getState().entries;
    expect(entries).toHaveLength(1);
    expect(entries[0].data).toEqual({ kind: 'meal', kcal: 800 });
  });

  it('toWire maps data.kind to kind and data to payload', () => {
    const w = toWire({
      id: 'a',
      ts: 2,
      day: '2026-07-04',
      tracker: 'running',
      source: 'gps',
      data: { kind: 'run', km: 4.2 },
    });
    expect(w.kind).toBe('run');
    expect(w.payload).toEqual({ kind: 'run', km: 4.2 });
    expect(w.deleted).toBe(false);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `pnpm --filter web test src/sync.test.ts`
Expected: FAIL - `Cannot find module './sync'`.

- [ ] **Step 3: Create `apps/web/src/sync.ts`**

```ts
import type { LogData, LogEntry, LogSource, Settings, TrackerId } from '@streka/core';
import { core } from './core';

const { useLogs, useSettings } = core;

export interface WireEntry {
  id: string;
  ts: number;
  day: string;
  tracker: string;
  source: string;
  kind: string;
  payload: unknown;
  deleted: boolean;
  updatedAt: number;
}

interface WireSetting {
  key: string;
  value: unknown;
  updatedAt: number;
}

interface SyncResult {
  cursor: number;
  entries: WireEntry[];
  settings: WireSetting[];
  hasMore: boolean;
}

interface SyncRequestBody {
  cursor: number;
  entries: WireEntry[];
  settings: WireSetting[];
}

// Session-scoped pull cursor. pullAll() resets it to 0 for a clean full
// snapshot on each mount; pushes advance it from the server's response.
let cursor = 0;

export function toWire(entry: LogEntry): WireEntry {
  return {
    id: entry.id,
    ts: entry.ts,
    day: entry.day,
    tracker: entry.tracker,
    source: entry.source,
    kind: entry.data.kind,
    payload: entry.data,
    deleted: entry.deleted ?? false,
    updatedAt: Date.now(),
  };
}

export function fromWire(w: WireEntry): LogEntry {
  return {
    id: w.id,
    ts: w.ts,
    day: w.day,
    tracker: w.tracker as TrackerId,
    source: w.source as LogSource,
    data: w.payload as LogData,
    deleted: w.deleted,
  };
}

async function postSync(body: SyncRequestBody): Promise<SyncResult> {
  const res = await fetch('/api/sync', {
    method: 'POST',
    credentials: 'same-origin',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`sync failed: ${res.status}`);
  return (await res.json()) as SyncResult;
}

function applySyncResult(result: SyncResult): void {
  if (result.entries.length > 0) {
    const byId = new Map(useLogs.getState().entries.map((e) => [e.id, e]));
    for (const w of result.entries) byId.set(w.id, fromWire(w));
    useLogs.getState().replaceAll([...byId.values()]);
  }
  const row = result.settings.find((s) => s.key === 'settings');
  if (row) useSettings.getState().set(row.value as Partial<Settings>);
  cursor = result.cursor;
}

// Full snapshot from cursor 0 on every mount. Clearing first guarantees a
// previous account's data cannot linger in a shared-browser session.
export async function pullAll(): Promise<void> {
  cursor = 0;
  useLogs.getState().replaceAll([]);
  let more = true;
  while (more) {
    const result = await postSync({ cursor, entries: [], settings: [] });
    applySyncResult(result);
    more = result.hasMore;
  }
}

export async function pushEntry(entry: LogEntry): Promise<void> {
  const result = await postSync({ cursor, entries: [toWire(entry)], settings: [] });
  applySyncResult(result);
}

export async function pushSettings(settings: Settings): Promise<void> {
  const result = await postSync({
    cursor,
    entries: [],
    settings: [{ key: 'settings', value: settings, updatedAt: Date.now() }],
  });
  applySyncResult(result);
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `pnpm --filter web test src/sync.test.ts`
Expected: PASS (6 tests).

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/sync.ts apps/web/src/sync.test.ts
git commit -m "feat(web): add the online sync client (pull-all on mount, push on write)"
```

---

### Task 3: Write helpers push to the account

**Files:**
- Modify: `apps/web/src/lib.ts`
- Test: `apps/web/src/lib.test.ts` (create)

**Interfaces:**
- Consumes: `pushEntry`, `pushSettings` from `./sync`; `core`, `webToast`, `webToastError` from `./core`; `dayOf`, `type { LogData, LogEntry, LogSource, Settings, TrackerId }` from `@streka/core`.
- Produces (unchanged names, new behavior): `logFromWeb(input)` now pushes the entry and toasts on the network result; `updateSettings(patch: Partial<Settings>)` sets and pushes settings. `useIsMobile`, `todayStr`, `formatDateLine` unchanged.

- [ ] **Step 1: Write the failing test**

Create `apps/web/src/lib.test.ts`:

```ts
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { core } from './core';
import { logFromWeb, updateSettings } from './lib';

function ok(body: unknown) {
  return { ok: true, json: async () => body };
}

beforeEach(() => {
  core.useLogs.setState({ entries: [] });
});
afterEach(() => {
  vi.unstubAllGlobals();
});

describe('logFromWeb', () => {
  it('appends locally and pushes the entry wire shape', async () => {
    const fetchMock = vi.fn().mockResolvedValue(ok({ cursor: 1, entries: [], settings: [], hasMore: false }));
    vi.stubGlobal('fetch', fetchMock);

    logFromWeb({
      tracker: 'meals',
      source: 'manual',
      data: { kind: 'meal', kcal: 550 },
      title: 'Meal logged',
    });

    expect(core.useLogs.getState().entries).toHaveLength(1);
    expect(fetchMock).toHaveBeenCalledWith('/api/sync', expect.objectContaining({ method: 'POST' }));
    const body = JSON.parse(fetchMock.mock.calls[0][1].body);
    expect(body.entries[0]).toMatchObject({ kind: 'meal', payload: { kind: 'meal', kcal: 550 } });

    await vi.waitFor(() => {
      expect(core.useToast.getState().toast?.sub).toBe('Saved to your account');
    });
  });
});

describe('updateSettings', () => {
  it('sets the store and pushes the whole settings object', async () => {
    const fetchMock = vi.fn().mockResolvedValue(ok({ cursor: 1, entries: [], settings: [], hasMore: false }));
    vi.stubGlobal('fetch', fetchMock);

    updateSettings({ nudge: { enabled: false, time: '17:30' } });

    expect(core.useSettings.getState().nudge.enabled).toBe(false);
    expect(fetchMock).toHaveBeenCalled();
    const body = JSON.parse(fetchMock.mock.calls[0][1].body);
    expect(body.settings[0].key).toBe('settings');
    expect(body.settings[0].value.nudge.enabled).toBe(false);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `pnpm --filter web test src/lib.test.ts`
Expected: FAIL - `updateSettings` does not exist and `logFromWeb` does not call `fetch`.

- [ ] **Step 3: Rewrite `apps/web/src/lib.ts`**

Replace the entire file with:

```ts
import { useEffect, useState } from 'react';
import {
  dayOf,
  type LogData,
  type LogEntry,
  type LogSource,
  type Settings,
  type TrackerId,
} from '@streka/core';
import { core, webToast, webToastError } from './core';
import { pushEntry, pushSettings } from './sync';

// Single 860px breakpoint (handoff web spec).
export function useIsMobile(): boolean {
  const [mobile, setMobile] = useState(() => window.innerWidth < 860);
  useEffect(() => {
    const mq = window.matchMedia('(max-width: 859px)');
    const onChange = () => setMobile(mq.matches);
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);
  return mobile;
}

// The one web append path: optimistic local append, push to the account, then
// confirm honestly (success toast on server ack, error toast on failure).
export function logFromWeb(input: {
  tracker: TrackerId;
  source: LogSource;
  data: LogData;
  title: string;
}) {
  const { tracker, source, data, title } = input;
  const ts = Date.now();
  const entry: LogEntry = { id: crypto.randomUUID(), ts, day: dayOf(ts), tracker, source, data };
  core.useLogs.getState().append(entry);
  pushEntry(entry)
    .then(() => webToast(title))
    .catch(() => webToastError());
}

// Settings mutate the whole object, pushed under one sync key.
export function updateSettings(patch: Partial<Settings>) {
  core.useSettings.getState().set(patch);
  pushSettings(core.useSettings.getState()).catch(() => webToastError());
}

export function todayStr(): string {
  return dayOf(Date.now());
}

export function formatDateLine(): string {
  return new Date().toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  });
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `pnpm --filter web test src/lib.test.ts`
Expected: PASS (2 tests).

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/lib.ts apps/web/src/lib.test.ts
git commit -m "feat(web): push entries and settings to the account on write"
```

---

### Task 4: Dashboard root wired into the guarded route

**Files:**
- Create: `apps/web/src/Dashboard.tsx`
- Delete: `apps/web/src/App.tsx` (orphaned; `App.test.tsx` was already removed in Task 1), `apps/web/src/index.css`
- Modify: `apps/web/app/app/page.tsx`, `apps/web/next.config.ts`, `apps/web/app/globals.css`
- Test: `apps/web/src/Dashboard.test.tsx` (create)

**Interfaces:**
- Consumes: `useAuthedEmail` from `@/components/auth/AuthedContext`; `SignOutButton` from `@/components/auth/SignOutButton`; `Slash` from `./components/bits`; `Toast` from `./components/Toast`; `Board`, `Trends`, `Goals` from `./sections/*`; `useIsMobile` from `./lib`; `pullAll` from `./sync`.
- Produces: `Dashboard()` React client component (default consumer is `app/app/page.tsx`).

- [ ] **Step 1: Write the failing test**

Create `apps/web/src/Dashboard.test.tsx`:

```tsx
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { AuthedEmailProvider } from '@/components/auth/AuthedContext';
import { core } from './core';
import { Dashboard } from './Dashboard';

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
}));

function ok(body: unknown) {
  return { ok: true, json: async () => body };
}

function renderDashboard() {
  return render(
    <AuthedEmailProvider email="rafi@example.com">
      <Dashboard />
    </AuthedEmailProvider>,
  );
}

beforeEach(() => {
  core.useLogs.setState({ entries: [] });
});
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe('Dashboard', () => {
  it('renders the nav and signed-in email, then hydrates to the board', async () => {
    const fetchMock = vi.fn().mockResolvedValue(ok({ cursor: 0, entries: [], settings: [], hasMore: false }));
    vi.stubGlobal('fetch', fetchMock);

    renderDashboard();

    expect(screen.getByText('Board')).toBeTruthy();
    expect(screen.getByText('Trends')).toBeTruthy();
    expect(screen.getByText('Goals')).toBeTruthy();
    expect(screen.getByText('rafi@example.com')).toBeTruthy();

    await waitFor(() => expect(screen.getByText('Today')).toBeTruthy());
    expect(fetchMock).toHaveBeenCalledWith('/api/sync', expect.objectContaining({ method: 'POST' }));
  });

  it('shows an honest error state when the pull fails', async () => {
    const fetchMock = vi.fn().mockRejectedValue(new Error('down'));
    vi.stubGlobal('fetch', fetchMock);

    renderDashboard();

    await waitFor(() => expect(screen.getByText('Could not load your data')).toBeTruthy());
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `pnpm --filter web test src/Dashboard.test.tsx`
Expected: FAIL - `Cannot find module './Dashboard'`.

- [ ] **Step 3: Create `apps/web/src/Dashboard.tsx`**

```tsx
'use client';

import { useEffect, useState } from 'react';
import { colors } from '@streka/tokens';
import { useAuthedEmail } from '@/components/auth/AuthedContext';
import { SignOutButton } from '@/components/auth/SignOutButton';
import { Slash } from './components/bits';
import { Toast } from './components/Toast';
import { Board } from './sections/Board';
import { Goals } from './sections/Goals';
import { Trends } from './sections/Trends';
import { useIsMobile } from './lib';
import { pullAll } from './sync';

export type Section = 'board' | 'trends' | 'goals';
type Load = 'loading' | 'ready' | 'error';

export function Dashboard() {
  const [section, setSection] = useState<Section>('board');
  const [load, setLoad] = useState<Load>('loading');
  const mobile = useIsMobile();
  const email = useAuthedEmail();

  useEffect(() => {
    let active = true;
    pullAll()
      .then(() => {
        if (active) setLoad('ready');
      })
      .catch(() => {
        if (active) setLoad('error');
      });
    return () => {
      active = false;
    };
  }, []);

  const pill = (name: Section, label: string) => {
    const on = section === name;
    return (
      <div
        key={name}
        onClick={() => setSection(name)}
        style={{
          padding: '8px 18px',
          borderRadius: 999,
          background: on ? colors.appBg : 'transparent',
          color: on ? '#fff' : colors.mutedLight,
          fontSize: 13,
          fontWeight: 800,
          cursor: 'pointer',
        }}
      >
        {label}
      </div>
    );
  };

  const centered: React.CSSProperties = {
    textAlign: 'center',
    padding: '80px 0',
    fontSize: 14,
    fontWeight: 700,
    color: colors.mutedLight,
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <div
        style={{
          position: 'sticky',
          top: 0,
          zIndex: 20,
          background: 'rgba(255,255,255,.95)',
          borderBottom: '1px solid rgba(0,0,0,.07)',
          backdropFilter: 'blur(8px)',
        }}
      >
        <div
          style={{
            maxWidth: 1120,
            margin: '0 auto',
            padding: '12px 20px',
            display: 'flex',
            alignItems: 'center',
            gap: 14,
            flexWrap: 'wrap',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 9, marginRight: 6 }}>
            <Slash size={21} color={colors.appBg} />
            <span style={{ font: "900 italic 20px 'Archivo'", letterSpacing: '-.03em' }}>STREKA</span>
          </div>
          <div style={{ display: 'flex', gap: 4, background: '#f0f2ee', borderRadius: 999, padding: 3 }}>
            {pill('board', 'Board')}
            {pill('trends', 'Trends')}
            {pill('goals', 'Goals')}
          </div>
          <div style={{ flex: 1 }} />
          <span
            style={{
              fontSize: 12.5,
              fontWeight: 700,
              color: colors.mutedLight,
              maxWidth: 200,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {email}
          </span>
          <SignOutButton />
        </div>
      </div>

      <div
        style={{
          flex: 1,
          width: '100%',
          maxWidth: 1120,
          margin: '0 auto',
          padding: mobile ? '16px 16px 40px' : '28px 24px 56px',
        }}
      >
        {load === 'loading' ? (
          <div style={centered}>Loading your data</div>
        ) : load === 'error' ? (
          <div style={centered}>Could not load your data</div>
        ) : (
          <>
            {section === 'board' ? <Board goGoals={() => setSection('goals')} /> : null}
            {section === 'trends' ? <Trends /> : null}
            {section === 'goals' ? <Goals /> : null}
          </>
        )}
      </div>
      <Toast />
    </div>
  );
}
```

- [ ] **Step 4: Delete the orphaned Vite-era shell**

```bash
git rm apps/web/src/App.tsx
```

- [ ] **Step 5: Point the route at the dashboard**

Replace `apps/web/app/app/page.tsx` with:

```tsx
'use client';

import { Dashboard } from '@/src/Dashboard';

export default function AppHome() {
  return <Dashboard />;
}
```

- [ ] **Step 6: Add `@streka/core` to `transpilePackages`**

In `apps/web/next.config.ts`, change the `transpilePackages` line so both raw-TS packages are transpiled:

```ts
  // @streka/tokens and @streka/core ship raw TS (main: src/index.ts); the /app
  // route now bundles both, so Next must transpile them.
  transpilePackages: ['@streka/tokens', '@streka/core'],
```

- [ ] **Step 7: Move the toast keyframes into globals, delete the orphaned index.css**

Confirm nothing imports `index.css`, then remove it after copying the one rule `globals.css` lacks:

```bash
grep -rn "index.css" apps/web --include=*.ts --include=*.tsx
```
Expected: no matches (the Vite entry that imported it was removed in S4a).

Append to `apps/web/app/globals.css`:

```css

@keyframes toastIn {
  from {
    transform: translate(-50%, 14px);
    opacity: 0;
  }
  to {
    transform: translate(-50%, 0);
    opacity: 1;
  }
}
```

Then:

```bash
git rm apps/web/src/index.css
```

- [ ] **Step 8: Run the test to verify it passes**

Run: `pnpm --filter web test src/Dashboard.test.tsx`
Expected: PASS (2 tests).

- [ ] **Step 9: Verify the production build wires both packages**

Run: `pnpm --filter web build`
Expected: build succeeds; `/app` is emitted (it is a client-rendered route). No "module not found" for `@streka/core`.

- [ ] **Step 10: Commit**

```bash
git add apps/web/src/Dashboard.tsx apps/web/src/Dashboard.test.tsx apps/web/app/app/page.tsx apps/web/next.config.ts apps/web/app/globals.css
git commit -m "feat(web): render the dashboard behind the auth guard on live sync"
```

---

### Task 5: Board honest-lean

**Files:**
- Modify: `apps/web/src/sections/Board.tsx`
- Test: `apps/web/src/sections/Board.test.tsx` (create)

**Interfaces:**
- Consumes: `logFromWeb` from `../lib` (unchanged signature); `useLogs`, `useSettings` from `../core`; `todayBoard`, `streak`, etc. from `@streka/core`.
- Produces: no exported-interface change; `Board({ goGoals })` still renders the board.

- [ ] **Step 1: Write the failing test**

Create `apps/web/src/sections/Board.test.tsx`:

```tsx
import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { core } from '../core';
import { Board } from './Board';

function ok(body: unknown) {
  return { ok: true, json: async () => body };
}

beforeEach(() => {
  core.useLogs.setState({ entries: [] });
});
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe('Board (honest, empty account)', () => {
  it('shows no fabricated steps or sleep metrics', () => {
    render(<Board goGoals={() => {}} />);
    expect(screen.queryByText(/auto from watch/i)).toBeNull();
    expect(screen.queryByText('8,246')).toBeNull();
    expect(screen.queryByText(/Sleep/i)).toBeNull();
    expect(screen.getByText('0-day streak')).toBeTruthy();
  });

  it('uses a plain hyphen, not an em dash, for empty tiles', () => {
    render(<Board goGoals={() => {}} />);
    expect(screen.queryByText('—')).toBeNull(); // no em dash anywhere
    expect(screen.getAllByText('-').length).toBeGreaterThan(0);
  });

  it('logging a meal pushes it to the account', async () => {
    const fetchMock = vi.fn().mockResolvedValue(ok({ cursor: 1, entries: [], settings: [], hasMore: false }));
    vi.stubGlobal('fetch', fetchMock);
    const user = userEvent.setup();

    render(<Board goGoals={() => {}} />);
    await user.click(screen.getByText('Meals'));
    await user.click(screen.getByText('Regular meal'));

    expect(fetchMock).toHaveBeenCalledWith('/api/sync', expect.objectContaining({ method: 'POST' }));
    const body = JSON.parse(fetchMock.mock.calls[0][1].body);
    expect(body.entries[0]).toMatchObject({ kind: 'meal', payload: { kind: 'meal', kcal: 550 } });
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `pnpm --filter web test src/sections/Board.test.tsx`
Expected: FAIL - the current Board renders `8,246`, a `Sleep · auto` tile, and `—` glyphs.

- [ ] **Step 3: Remove the fabricated steps hero block**

In `apps/web/src/sections/Board.tsx`, delete the entire dark steps block (the `<div>` whose `TileLabel` is `Steps · auto from watch` and that renders `8,246`, `72%`, and `goal 11,500`). It sits between the streak header row and the tile grid.

- [ ] **Step 4: Remove the Sleep tile**

Delete the last tile in the grid (the `<div>` whose `TileLabel` is `Sleep · auto`, rendering `7h 20m` and `from watch`).

- [ ] **Step 5: Replace fabricated placeholders and em dashes**

Apply these exact replacements in the tile grid:

Workout empty tile:
```tsx
          <Tile
            label="Workout"
            title="-"
            sub="not logged yet"
            onClick={() => setModal('workout')}
            greenBorder
            plusTinted
          />
```

Meals tile title:
```tsx
          title={board.mealsKcal > 0 ? board.mealsKcal.toLocaleString('en-US') : '-'}
```

Run tile:
```tsx
        <Tile
          label="Run"
          title={board.runKm !== undefined ? `${board.runKm} km` : '-'}
          sub={board.runKm !== undefined ? 'logged today' : 'not logged yet'}
          onClick={() => setModal('run')}
        />
```

Weight tile:
```tsx
        <Tile
          label="Weight"
          title={board.weightKg !== undefined ? `${board.weightKg.toFixed(1)} kg` : '-'}
          sub={
            board.weightLoggedToday
              ? 'updated today'
              : board.weightKg !== undefined
                ? 'not updated today'
                : 'not logged yet'
          }
          subColor={board.weightLoggedToday ? colors.accentOnLight : colors.mutedLight}
          onClick={openWeight}
        />
```

Swim tile:
```tsx
        <Tile
          label="Swim"
          title={board.swimM !== undefined ? `${board.swimM.toLocaleString('en-US')} m` : '-'}
          sub={board.swimM !== undefined ? 'logged today' : 'not logged yet'}
          onClick={() => setModal('swim')}
        />
```

Class tile (drop the fabricated `Yoga 18:30` booking and the em dash in the toast title):
```tsx
        <Tile
          label="Class"
          title={board.classDone ? 'Attended ✓' : 'Class'}
          sub={board.classDone ? 'logged today' : 'log a class'}
          onClick={
            board.classDone
              ? undefined
              : () =>
                  logFromWeb({
                    tracker: 'classes',
                    source: 'manual',
                    data: { kind: 'class' },
                    title: 'Class logged',
                  })
          }
        />
```
(The `✓` above is the existing check glyph `✓`; keep it literal in the file.)

Also open the weight modal default without the `72.4` fabrication - change `openWeight`:
```tsx
  const openWeight = () => {
    setWeightDraft(board.weightKg ?? 70);
    setModal('weight');
  };
```

- [ ] **Step 6: Fix the remaining em dashes in Board copy**

Footer note:
```tsx
        Live workout sessions with a timer run on the phone app. The web board is for quick logs
        and review.
```

Workout modal toast title:
```tsx
                        title: `Workout logged: ${t.name}`,
```

- [ ] **Step 7: Run the test to verify it passes**

Run: `pnpm --filter web test src/sections/Board.test.tsx`
Expected: PASS (3 tests).

- [ ] **Step 8: Commit**

```bash
git add apps/web/src/sections/Board.tsx apps/web/src/sections/Board.test.tsx
git commit -m "feat(web): honest Board on real entries, no steps/sleep fabrications"
```

---

### Task 6: Trends honest-lean

**Files:**
- Modify: `apps/web/src/sections/Trends.tsx`
- Test: `apps/web/src/sections/Trends.test.tsx` (create)

**Interfaces:**
- Consumes: `useLogs` from `../core`; `bestLift`, `monthWeekCounts`, etc. from `@streka/core`.
- Produces: no interface change; `Trends()` renders the trends view.

- [ ] **Step 1: Write the failing test**

Create `apps/web/src/sections/Trends.test.tsx`:

```tsx
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { core } from '../core';
import { Trends } from './Trends';

beforeEach(() => {
  core.useLogs.setState({ entries: [] });
});
afterEach(cleanup);

describe('Trends (honest, empty account)', () => {
  it('drops the steps stat and its seed', () => {
    render(<Trends />);
    expect(screen.queryByText('best step day')).toBeNull();
    expect(screen.queryByText('8,246')).toBeNull();
  });

  it('shows an honest empty weight, not a fake 72.4', () => {
    render(<Trends />);
    expect(screen.queryByText('72.4')).toBeNull();
    expect(screen.queryByText('—')).toBeNull(); // no em dash
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `pnpm --filter web test src/sections/Trends.test.tsx`
Expected: FAIL - Trends renders `best step day`, seeds `8246`, and falls back to `72.4`.

- [ ] **Step 3: Remove the steps seed and stat**

In `apps/web/src/sections/Trends.tsx`, in the `bests` memo, remove the steps seed and the steps loop line and the `bestSteps` field:

```tsx
  const bests = useMemo(() => {
    const monthStart = addDays(today, -30);
    let longestRun = 0;
    for (const e of entries) {
      if (e.deleted || e.day < monthStart) continue;
      if (e.data.kind === 'run') longestRun = Math.max(longestRun, e.data.km);
    }
    return { longestRun, lift: bestLift(entries, monthStart) };
  }, [entries, today]);
```

Delete the third stat block in the "Bests this month" card (the one rendering `bests.bestSteps.toLocaleString('en-US')` and `best step day`). Leave the top-lift and longest-run stats.

Also replace the em dash in the top-lift stat:
```tsx
              <div style={{ fontSize: 22, fontWeight: 900 }}>
                {bests.lift ? `${bests.lift.kg} kg` : '-'}
              </div>
```

- [ ] **Step 4: Give the weight card an honest empty state**

Replace the weight-derived values so an account with no weight entries shows `-` and no fake number:

```tsx
  const weightNow = weights.length > 0 ? weights[weights.length - 1]!.data.kg : undefined;
  const weightDelta = useMemo(() => {
    if (weights.length < 2 || weightNow === undefined) return 0;
    const cutoff = addDays(today, -30);
    const old = weights.find((w) => w.day >= cutoff) ?? weights[0]!;
    return weightNow - old.data.kg;
  }, [weights, weightNow, today]);
```

In the weight card, render the number honestly and only show the delta badge when there are at least two points:

```tsx
        <Card style={{ padding: 22 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
            <TileLabel>Weight</TileLabel>
            {weights.length >= 2 ? (
              <div style={{ fontSize: 12, fontWeight: 800, color: colors.accentOnLight }}>
                {weightDelta <= 0 ? '▾' : '▴'} {Math.abs(weightDelta).toFixed(1)} kg in 30 days
              </div>
            ) : null}
          </div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginTop: 4 }}>
            <div style={{ fontSize: 32, fontWeight: 900 }}>
              {weightNow !== undefined ? weightNow.toFixed(1) : '-'}
            </div>
            <div style={{ fontSize: 13, fontWeight: 700, color: colors.mutedLight }}>kg</div>
          </div>
          {line ? (
            <svg
              width="100%"
              height="64"
              viewBox="0 0 300 52"
              preserveAspectRatio="none"
              style={{ marginTop: 8, display: 'block' }}
            >
              <polyline
                points={line.path}
                fill="none"
                stroke={colors.accent}
                strokeWidth={3}
                strokeLinecap="round"
              />
              <circle cx={line.last[0]} cy={line.last[1]} r={4} fill={colors.accentOnLight} />
            </svg>
          ) : null}
        </Card>
```

(The `▾`/`▴` are the existing `▾`/`▴` triangles; keep them literal.)

- [ ] **Step 5: Run the test to verify it passes**

Run: `pnpm --filter web test src/sections/Trends.test.tsx`
Expected: PASS (2 tests).

- [ ] **Step 6: Commit**

```bash
git add apps/web/src/sections/Trends.tsx apps/web/src/sections/Trends.test.tsx
git commit -m "feat(web): honest Trends, drop the steps seed and fake weight fallback"
```

---

### Task 7: Goals honest-lean + testable Toggle

**Files:**
- Modify: `apps/web/src/sections/Goals.tsx`, `apps/web/src/components/bits.tsx`
- Test: `apps/web/src/sections/Goals.test.tsx` (create)

**Interfaces:**
- Consumes: `updateSettings` from `../lib`; `useLogs`, `useSettings` from `../core`; `weekStartOf`, `weeklyActiveDays` from `@streka/core`.
- Produces: `Goals()` renders the rhythm card + new-goal placeholder. `Toggle` gains `role="switch"` and `aria-checked`.

- [ ] **Step 1: Write the failing test**

Create `apps/web/src/sections/Goals.test.tsx`:

```tsx
import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { core } from '../core';
import { Goals } from './Goals';

function ok(body: unknown) {
  return { ok: true, json: async () => body };
}

beforeEach(() => {
  core.useLogs.setState({ entries: [] });
  core.useSettings.getState().set({ rhythmDays: 3, nudge: { enabled: true, time: '17:30' } });
});
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe('Goals (honest, lean)', () => {
  it('drops the fabricated steps and weight-target cards', () => {
    render(<Goals />);
    expect(screen.queryByText('70,000 steps a week')).toBeNull();
    expect(screen.queryByText('Reach 70 kg')).toBeNull();
    expect(screen.queryByText(/auto from watch/i)).toBeNull();
    expect(screen.getByText('Active 3 days a week')).toBeTruthy();
    expect(screen.getByText('+ New goal')).toBeTruthy();
  });

  it('toggling the nudge pushes the settings row', async () => {
    const fetchMock = vi.fn().mockResolvedValue(ok({ cursor: 1, entries: [], settings: [], hasMore: false }));
    vi.stubGlobal('fetch', fetchMock);
    const user = userEvent.setup();

    render(<Goals />);
    await user.click(screen.getByRole('switch'));

    expect(core.useSettings.getState().nudge.enabled).toBe(false);
    expect(fetchMock).toHaveBeenCalledWith('/api/sync', expect.objectContaining({ method: 'POST' }));
    const body = JSON.parse(fetchMock.mock.calls[0][1].body);
    expect(body.settings[0].key).toBe('settings');
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `pnpm --filter web test src/sections/Goals.test.tsx`
Expected: FAIL - Goals still renders the steps and weight-target cards; `getByRole('switch')` finds no switch (Toggle has no role).

- [ ] **Step 3: Make `Toggle` a switch**

In `apps/web/src/components/bits.tsx`, add the role and state to the outer `Toggle` div:

```tsx
export function Toggle({ on, onToggle }: { on: boolean; onToggle: () => void }) {
  return (
    <div
      onClick={onToggle}
      role="switch"
      aria-checked={on}
      style={{
        width: 40,
        height: 24,
        borderRadius: 12,
        background: on ? colors.accent : '#dfe3dd',
        position: 'relative',
        cursor: 'pointer',
        flex: 'none',
      }}
    >
```
(Leave the inner knob div and the rest of the component unchanged.)

- [ ] **Step 4: Trim Goals to the honest rhythm card**

Replace the entire body of `apps/web/src/sections/Goals.tsx` with the lean version (rhythm card wired to `updateSettings`, plus the new-goal placeholder; steps card, weight-target card, `GoalBar`, and their computations removed):

```tsx
import { weekStartOf, weeklyActiveDays } from '@streka/core';
import { colors } from '@streka/tokens';
import { useLogs, useSettings } from '../core';
import { todayStr, useIsMobile, updateSettings } from '../lib';
import { Card, Toggle } from '../components/bits';

export function Goals() {
  const mobile = useIsMobile();
  const settings = useSettings();
  const entries = useLogs((s) => s.entries);
  const today = todayStr();
  const weekStart = weekStartOf(today);

  const active = weeklyActiveDays(entries, weekStart);
  const goalCount = Math.min(settings.rhythmDays, active);
  const dayIdx = Math.round((Date.parse(today) - Date.parse(weekStart)) / 86_400_000);
  const daysLeft = 7 - dayIdx;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <div style={{ padding: '6px 2px 4px' }}>
        <div
          style={{
            fontSize: 12,
            fontWeight: 700,
            letterSpacing: '.08em',
            textTransform: 'uppercase',
            color: colors.mutedLight,
          }}
        >
          This week · {daysLeft} {daysLeft === 1 ? 'day' : 'days'} left
        </div>
        <div
          style={{
            fontSize: 'clamp(28px,3.4vw,38px)',
            fontWeight: 900,
            letterSpacing: '-.02em',
            lineHeight: 1.05,
          }}
        >
          Goals
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: mobile ? '1fr' : '1fr 1fr', gap: 12 }}>
        <Card style={{ padding: 22, display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ fontSize: 16, fontWeight: 900 }}>Active {settings.rhythmDays} days a week</div>
            <div style={{ fontSize: 13, fontWeight: 900, color: colors.accentOnLight }}>
              {goalCount} / {settings.rhythmDays}
            </div>
          </div>
          <div style={{ display: 'flex', gap: 6 }}>
            {Array.from({ length: settings.rhythmDays }, (_, i) => (
              <div
                key={i}
                style={{
                  flex: 1,
                  height: 8,
                  borderRadius: 4,
                  background: i < goalCount ? colors.accent : '#eef0ec',
                }}
              />
            ))}
          </div>
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              fontSize: 12,
              fontWeight: 600,
              color: colors.mutedLight,
            }}
          >
            <span>Nudge: days you haven&apos;t logged, {settings.nudge.time}</span>
            <Toggle
              on={settings.nudge.enabled}
              onToggle={() =>
                updateSettings({ nudge: { ...settings.nudge, enabled: !settings.nudge.enabled } })
              }
            />
          </div>
        </Card>

        <div
          className="pressable"
          style={{
            border: '1.5px dashed rgba(0,0,0,.18)',
            borderRadius: 20,
            padding: 22,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 13.5,
            fontWeight: 800,
            color: colors.mutedLight,
          }}
        >
          + New goal
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 5: Run the test to verify it passes**

Run: `pnpm --filter web test src/sections/Goals.test.tsx`
Expected: PASS (2 tests).

- [ ] **Step 6: Full web suite + typecheck**

Run: `pnpm --filter web test`
Expected: PASS (all suites: core, sync, lib, Dashboard, Board, Trends, Goals).

Run: `pnpm -r exec tsc --noEmit`
Expected: exit 0 (no type errors across the workspace).

- [ ] **Step 7: Commit**

```bash
git add apps/web/src/sections/Goals.tsx apps/web/src/components/bits.tsx apps/web/src/sections/Goals.test.tsx
git commit -m "feat(web): lean honest Goals, nudge toggle syncs settings"
```

---

## Notes for the implementer

- **Do not touch `apps/server`, `apps/mobile`, or `packages/core`.** If a task seems to require a server change, stop and escalate: the S3 wire contract is fixed.
- **Em dashes are forbidden.** When editing a section, scan the file for `—` (U+2014) and replace it; the tests assert its absence in Board and Trends.
- **The math minus `−` in the weight stepper (Board modal) is not an em dash** - leave it.
- Section render tests do not need a router mock (the sections use no router). Only `Dashboard.test.tsx` mocks `next/navigation` (via `SignOutButton`).
- `crypto.randomUUID()` is available in the jsdom/Node test environment; no polyfill needed.
