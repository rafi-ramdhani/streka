# Dashboard on live sync (S4b): port Board/Trends/Goals onto `POST /sync`

Date: 2026-07-04. Status: design for review. Slice S4b of the web-first backend pivot.

## Context

S1 built `apps/server` (Hono + Drizzle + Postgres). S2 added accounts, sessions, and
`requireAuth`. S3 added the authed `POST /sync` push/pull endpoint (LWW merge, per-account
advisory lock, server-assigned `server_seq` cursor). S4a turned `apps/web` into a Next.js app:
SSG landing, sign-up/in/out, a client session guard on `/app`, and a minimal authed shell that
renders "You are signed in" plus a sign-out button. S4a deliberately stopped short of the
dashboard and kept the Vite-era dashboard code (`apps/web/src/*`: `App.tsx`, `core.ts`, `lib.ts`,
`sections/{Board,Trends,Goals}.tsx`, `components/{bits,Modal,Toast}.tsx`) untouched as the S4b
port source.

S4b fills `/app` with the real dashboard and makes it the **first live client of `POST /sync`**.
Today that dashboard is a demo: its data comes from `localStorage` + `seedDemo()` (a fabricated
history), and several tiles hardcode values web cannot produce (steps `8,246`, sleep `7h 20m`
"from watch", a `72% / goal 11,500` steps ring, `"Synced · iPhone, just now"`, a `JT` avatar,
weight fallbacks `72.4`/`73.6`, `"last: Tue · Upper body"` hints, a fabricated `Reach 70 kg`
goal). Steps and sleep arrive from the phone's `health` source; web has no path to produce them,
and a brand-new real account has zero entries. So S4b is not a pixel port: it replaces the data
source with the live API **and** removes the fabrications, per the shelved honest-web intent.

| Slice | Scope | Depends on |
|------|-------|-----------|
| S1-S3 (done) | server skeleton, auth, `POST /sync` | - |
| S4a (done) | Next.js app: landing, auth pages/flow, guarded `/app` shell | S2 |
| **S4b (this doc)** | Dashboard on `/sync`: Board/Trends/Goals on live data, honest states, retire the demo code | S3, S4a |
| Later | Mobile sync transport (wire mobile's outbox to `/sync`) | S3 |

## Locked decisions

- **Honest & lean.** Web renders only what a real account can produce on web. Remove: the steps
  ring, the sleep tile, the `"Synced · iPhone just now"` status, the `JT` avatar, the whole
  `seedDemo`/`ensureSeeded` demo history, Goals' `"70,000 steps a week / auto from watch"` card,
  and Goals' fabricated `"Reach 70 kg"` weight-target card (no weight-goal exists in the data
  model). Keep, on real data: streak, meals, run, weight, workout, swim, class, week/month
  activity, weight trend, and the rhythm (active-days) goal. Empty accounts show honest empty
  states, not fake numbers.
- **Thin, online-only sync client.** Consistent with web's existing "always online by framing"
  decision. No offline outbox, no retry queue (YAGNI for web). On `/app` mount, pull a full
  snapshot; on each write, push the changed row and merge the response. A failed request surfaces
  an honest failure toast, never the old `"visible on your phone in a moment"` copy.
- **Pull the full snapshot from cursor 0 on every mount**, keeping the cursor only in memory for
  the session. A personal tracker is small, and re-pulling from 0 sidesteps a whole class of
  stale/cross-account cursor bugs. The in-memory cursor advances only to serve the session's
  incremental push responses.
- **Settings sync as one row.** The whole `Settings` object is stored under a single sync key
  `settings` (value = the object). Simplest LWW grain. Carry-forward: mobile's eventual settings
  sync must agree on this shape.
- **Ephemeral in-memory store, server is the authority.** The web core no longer persists entries
  (or settings) to `localStorage`. It uses an in-memory `StateStorage` so account A's data cannot
  leak into account B's session on a shared browser; the store is hydrated from `/sync` on mount.
- **`@streka/core` joins `transpilePackages`.** It ships raw TS (`main: src/index.ts`) and is now
  bundled by the `/app` route. Its runtime import graph contains no native module (the lone
  `better-sqlite3` reference is a comment in `repo.ts`; the real import is in a test file), so it
  bundles cleanly.
- **Port the retained `src/*` in place.** Edit the existing files rather than relocating the tree;
  add one new `src/sync.ts` engine. Retire only the genuinely dead demo code. No move of
  `test-setup.ts`/`index.css` (config still points at `src/`).
- **`apps/server` is not modified by S4b.** No route, schema, cookie, or CORS change.

## Architecture

```
browser ──▶ Next.js (apps/web, :3000)
                 │  guarded /app  ── on mount: POST /api/sync {cursor:0}  ─┐
                 │                 ── on write: POST /api/sync {entries|settings} ─┤
                 └─ rewrites /api/:path* ──▶ Hono API (apps/server, :3001) ◀──────┘
                                                /sync (requireAuth), /auth/*
```

The S4a same-origin rewrite is unchanged: the browser only ever talks to the web origin, so the
`streka_session` cookie authorizes `/api/sync` with no CORS and no server change. Two open tabs =
two concurrent same-account `/sync` transactions, which is exactly what the S3 per-account
advisory lock exists to serialize; S4b is the first client to exercise it live.

## Sync engine (`apps/web/src/sync.ts`, new)

A small module over the web core store. It owns a module-scoped in-memory `cursor` (starts at 0).

- **`pullAll()`** - loop: `POST /api/sync` with `{ cursor, entries: [], settings: [] }`,
  `applySyncResult(result)`, repeat while `result.hasMore`. Called once on dashboard mount.
- **`pushEntry(entry: LogEntry)`** - `POST /api/sync` with
  `{ cursor, entries: [toWire(entry)], settings: [] }`, then `applySyncResult(result)`.
- **`pushSettings(settings: Settings)`** - `POST /api/sync` with
  `{ cursor, entries: [], settings: [{ key: 'settings', value: settings, updatedAt: Date.now() }] }`,
  then `applySyncResult(result)`.
- **`applySyncResult(result)`** - upsert `result.entries` into `useLogs` by `id` (reconstruct the
  core shape, see mapping); if a `settings` row is present, apply its value via
  `useSettings.getState().set(value)`; advance `cursor = result.cursor`.

`fetch` uses `credentials: 'same-origin'` and `content-type: application/json`, mirroring the S4a
`AuthForm`. All three call paths share one internal `postSync(body)` helper. There is no store
subscription: pulls apply data without re-pushing, and writes push explicitly (below), so no
pull → set → push loop is possible.

### Wire-format mapping (server contract unchanged)

Push (`LogEntry` → wire `PushEntry`):

```
{ id, ts, day, tracker, source,
  kind: entry.data.kind,
  payload: entry.data,
  deleted: entry.deleted ?? false,
  updatedAt: Date.now() }
```

`updatedAt` is stamped at push time. The single online client always pushes an increasing
`Date.now()`, so server-side strictly-greater LWW resolves correctly.

Pull (wire `PullEntry` → `LogEntry`):

```
{ id, ts, day,
  tracker: tracker as TrackerId,
  source: source as LogSource,
  data: payload as LogData,
  deleted }
```

`tracker`/`source` come back as opaque strings and are cast to their branded types; the redundant
top-level `kind` and the `updatedAt` are dropped from the in-memory shape.

## Write interception

The dashboard has exactly two write surfaces, both web-owned, so writes push explicitly (no
diffing, no subscription):

- **Entries - `logFromWeb()` in `src/lib.ts`.** This is the sole entry-append path for every
  section (Board's modals, class, weight). After `useLogs.getState().append(entry)`, call
  `pushEntry(entry)`; show an honest success toast, or a failure toast if the push rejects.
- **Settings - a new `updateSettings(patch)` helper in `src/lib.ts`.** It calls
  `useSettings.getState().set(patch)` then `pushSettings(useSettings.getState())`. Goals calls
  `updateSettings` instead of `settings.set` for the nudge toggle.

## Honest-lean UI changes (per file)

**`src/core.ts`** - Delete `ensureSeeded`/`seedDemo` and today's fabricated run/meals seed. Swap
the `localStorage` `StateStorage` for an in-memory `Map`-backed one. Change `webToast` copy from
`"Synced · visible on your phone in a moment"` to an honest `"Saved to your account"`, and add a
failure toast string (e.g. `"Could not save - check your connection"`).

**`src/lib.ts`** - `logFromWeb` pushes via `pushEntry` and toasts honestly (success/failure). Add
`updateSettings`.

**Dashboard root (formerly `src/App.tsx`)** - Keep the STREKA logo, the Board/Trends/Goals nav
pills, and section switching. Remove the `"Synced · iPhone, just now"` status dot and the `JT`
avatar; in their place show the signed-in email (from the S4a `useAuthedEmail()` context) and a
sign-out control (reuse `components/auth/SignOutButton`). Mark the file `'use client'`; fire
`pullAll()` in a mount `useEffect` and show a brief "Loading your data" state until the first pull
resolves.

**`src/sections/Board.tsx`** - Remove the dark steps hero block
(`Steps · auto from watch / 8,246 / 72% / goal 11,500`) and the `Sleep · auto / 7h 20m` tile.
The tile grid becomes workout, meals, run, weight, swim, class (6 tiles). Replace every `—`
no-data glyph with `-`. Drop hardcoded `72.4` weight and fabricated `"last: Tue · ..."` hints:
show real values from `todayBoard`, and honest subs (`"not logged yet"`) when a tracker has no
entry. Keep the streak pill, the "This week" week-bars card, the rhythm goal card, and the footer
note.

**`src/sections/Trends.tsx`** - Remove the `bestSteps = 8246` seed and the "best step day" stat
(no steps on web); "Bests this month" becomes top lift + longest run. Drop the `72.4` weight
fallback: when there are fewer than 2 weight entries, show an honest empty weight card (no fake
number, no line). Keep active-days, the real weight trend, and the consistency grid.

**`src/sections/Goals.tsx`** - Remove the steps card (`70,000 steps a week / auto from watch`,
`stepsNudge` local state) and the fabricated `Reach 70 kg` weight-target card. Keep the rhythm
("Active N days a week") card on real active days with the nudge toggle wired to
`updateSettings`, plus the `+ New goal` placeholder. Goals is intentionally lean for a web
account whose only real goal is the weekly rhythm.

## App Router integration

- **`app/app/page.tsx`** (replaces the S4a placeholder) - a `'use client'` component that renders
  the dashboard root inside the S4a guard. It consumes `useAuthedEmail()` for the header and
  triggers the mount pull.
- **`app/app/layout.tsx`** - unchanged S4a guard; still provides the email via
  `AuthedEmailProvider`.
- **`next.config.ts`** - add `@streka/core` to `transpilePackages`.
- Dashboard hover/press CSS currently in `src/index.css` (`.tile`, `.pressable`, etc.) moves into
  `app/globals.css` so the ported components keep their interactions.

## Error handling

- A failed `pushEntry`/`pushSettings` leaves the optimistic local change in the store (the user
  sees their log) and shows the honest failure toast; retry happens by acting again. No silent
  loss, no fake success copy.
- A failed `pullAll()` (server down) shows an inline "Could not load your data" state on the
  dashboard rather than an empty board masquerading as a real empty account; the guard already
  redirects unauthenticated users to `/signin`.
- `postSync` treats any non-2xx as a failure (honest toast/inline error). A 401 mid-session (rare)
  falls through to the failure path; the next mount's guard handles re-auth.

## Testing

vitest + `@testing-library/react`, `jsdom`, `fetch` mocked per test.

- **sync engine**: `pullAll` posts `{cursor:0}` and hydrates the store from the response
  (`replaceAll`-equivalent upsert), looping on `hasMore`; `pushEntry` posts the exact wire shape
  (`kind`/`payload`/`deleted`/`updatedAt`) and merges the returned rows; `pushSettings` posts the
  single `settings` row; `applySyncResult` advances the cursor.
- **Board**: an empty account renders honest empty states (streak `0`, `-` tiles, no steps/sleep
  block); logging a meal calls `pushEntry` with the meal payload.
- **Goals**: toggling the nudge calls `updateSettings`, which pushes the settings row.
- No Playwright/e2e in S4b. Manual verification (the real advisory-lock exercise): run the server
  + `pnpm --filter web dev`, sign in, log across two tabs, confirm both converge after reload.

## Non-goals (S4b)

- Any change to `apps/server` (no new route, no schema/cookie/CORS change).
- Offline support, an outbox, or retry queues on web (online-only by framing).
- Mobile sync transport (a later phase).
- Editing or deleting existing entries on web (no such UI exists today; web is append-only). Pulled
  tombstones are honored, but web creates none.
- New goal types, a weight-target model, or reintroducing steps/sleep on web.
- Server-side/middleware auth guard (the S4a client guard still stands; flash removal is deferred).

## Retirement in S4b

- Delete `seedDemo`/`ensureSeeded` and the demo seed from `src/core.ts`; stop persisting entries to
  `localStorage`.
- Remove the Vite-era standalone entry test `src/App.test.tsx` (it asserts the old demo shell);
  replace with the sync/section tests above.
- The dashboard now lives behind auth at `/app`; there is no longer any unauthenticated demo view.
