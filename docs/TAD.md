# Streka. Technical Architecture Document (TAD)

Status: v1, approved decisions from the product owner captured in "Decisions".
Sources of truth: `design_handoff_streka/README.md` (spec), `Streka Prototype.dc.html` (native behavior), `Streka Web App.dc.html` (web behavior), `Streka Landing.dc.html` (marketing page), `Fitness App Explorations.dc.html` turns 10a-12c (static screens), `screenshots/` (reference captures).

This document defines how we build it, not what it looks like. Visual detail (colors, spacing, copy) is not restated here; the handoff is final and high fidelity, and implementation reads pixel values and copy directly from the prototype HTML. Product rules 1-6 in the handoff README are settled and encoded in `packages/core`.

## 1. Scope and decisions

Decisions made with the owner for this round:

1. **Scope**: all three surfaces, mobile first. Order: RN mobile app, then web dashboard, then landing page.
2. **Backend**: local-first with mocked services. Full local persistence; sync and food scan go through thin service interfaces with mock implementations. A real backend is a later project. UI and state logic are fully real.
3. **Mobile toolchain**: Expo (managed, expo-router). Dev client / config plugins only when a real native module lands (background GPS, HealthKit); none required in v1.
4. **Structure**: pnpm workspace monorepo with a shared domain core, so streak rules, log model, and tokens exist exactly once.

Out of scope for v1 (deferred, interfaces in place): real auth, real sync transport, LLM scan backend, HealthKit/Health Connect, background location, push/local notification delivery, map SDK. Each is behind an interface in `packages/core` with a mock implementation, so swapping in the real thing later does not touch UI code.

## 2. Repository layout

```
streka/
  design_handoff_streka/   handoff bundle (reference, committed as-is)
  docs/                    TAD, plans
  apps/
    mobile/                Expo app (dark, native shell)
    web/                   Vite + React dashboard (light, top nav)
    landing/               static marketing page
  packages/
    core/                  TS domain: types, log model, derivations, stores, services
    tokens/                design tokens: colors, type scale, spacing, radii
```

- pnpm workspaces; `.npmrc` with `node-linker=hoisted` for Metro compatibility.
- TypeScript everywhere, strict. Node 22.
- Git: all work on `staging` branch.

## 3. packages/tokens

Plain TS constants translated 1:1 from the handoff "Design Tokens" section: `colors` (accent `#17C25F`, onLight `#17A253`, onDark `#3FE07F`, ink `#0B1C10`, appBg `#131712`, tile `#1D231C`, webBg `#F5F7F3`, muted dark/light, amber, danger, divider opacities), `radii` (tile 20-22, sheet 28, button 14-16, pill 999), `spacing` (grid gap 10-12, screen pad 18-24), `type` (Archivo weights, wordmark style, tile/label/body sizes, tabular-nums rule), plus the slash-mark SVG geometry (`rect x=16 y=-8 w=14 h=62 rx=7, rotate 32deg, viewBox 46`). Consumed by all three apps; no styling values hardcoded in app code where a token exists.

## 4. packages/core (domain)

### 4.1 Data model

Log entries are immutable events (handoff product rule 5): client-generated UUID + timestamp, last-write-wins, never mutated. Deleting = tombstone flag (used by run summary Delete).

```ts
type TrackerId = 'steps'|'workouts'|'meals'|'running'|'weight'|'swimming'|'classes'|'sleep';
type LogSource = 'manual'|'session'|'gps'|'scan'|'health';   // health never counts toward streak
interface LogEntry {
  id: string; ts: number; day: string;        // day = local YYYY-MM-DD at creation
  tracker: TrackerId; source: LogSource;
  data: WorkoutData|MealData|RunData|SwimData|WeightData|ClassData;
  deleted?: boolean;
}
interface Settings {
  onboarded: boolean;
  picked: Record<TrackerId, boolean>;          // defaults: workouts/running/meals/weight/steps on
  rhythmDays: 2|3|4|5|6;                       // default 3
  nudge: { enabled: boolean; time: string };   // default true, '17:30'
  healthConnected: boolean; hasAccount: boolean;
  units: 'metric'|'imperial';
  kcalGoal: number;                            // 2200
  stepsGoalDay: number;                        // 11500
  stepsGoalWeek: number;                       // 70000
}
```

### 4.2 Derivations (pure functions, unit-tested)

All mirror the prototype logic exactly (extracted from the `.dc.html` script blocks):

- `streak(days, today)`: consecutive local days with at least one intentional log (source != 'health'), counting today if logged, else ending yesterday. Displayed value matches prototype `base + (anyLoggedToday ? 1 : 0)`.
- `todayBoard(logs, settings, health)`: per-tile state (workout name + mins, meals kcal sum + pct of goal, run km, swim m, latest weight + loggedToday, class attended, steps/sleep from health provider).
- `isFirstLogOfDay(logs, day)`: drives the streak toast.
- `toastCopy(account, online, firstLog, streakN)`: exact wording table from the prototype (`Saved on this phone` / `Synced to your account` / offline suffix / `Streak started` vs `Streak kept` day lines).
- `scanTotal(ingredients, removed, portion)`: sum of kept kcal x portion multiplier (.7/1/1.3), rounded to 10; `scanRange` = +/-10% each rounded to 10, rendered as a range.
- `weeklyActiveDays(logs, weekStartMonday)`: distinct intentional-log days; feeds Goals segments (capped at rhythmDays) and Trends bars.
- `trendsSeries(logs, period)`: week = 7 day bars, month = 4 week bars; only real data, dashed placeholders for future days (empty-state rule: no fake data, ever).

### 4.3 Stores (Zustand, shared mobile + web)

- `useSettings`: Settings, persisted.
- `useLogs`: `entries: LogEntry[]`, `append(entry)` (fires toast via toastCopy + streak check), persisted.
- `useSync`: `{ online, hasAccount }` -> 3-state pill model (`Synced` / `Offline` / `On this phone`). Mobile keeps the prototype's tap-to-simulate-offline in dev builds only.
- `useToast`: single toast, 2.8s auto-dismiss.
- Mobile-only stores (in the mobile app, same style): `useSession` (live workout: startTs, name, sets[], set toggling, finish -> append log), `useGpsRun` (primed, mode: primer/live/paused/summary, timing with pausedTotal), `useFoodScan` (mode: camera/analyzing/result/unsure, portion, removed[]).

Persistence: on mobile, all durable state lives in one SQLite database (expo-sqlite) whose schema is defined in core (`schema.ts`) and designed to mirror the future server tables: `log_entries` is an append-only event table keyed by client UUID with `updated_at` (last-write-wins), tombstone `deleted`, and local-only `synced_at` (NULL or stale = outbox row awaiting upload); `kv` holds settings per-key. The store factory takes a `LogRepo` (write-through cache + boot hydration); the merge upsert for future server pulls ships and is tested. On web, `zustand/persist` over localStorage remains. Everything works offline by construction; sync state only changes indicator copy (product rule 3).

### 4.4 Services (interface + mock)

```ts
interface ScanService  { analyze(photo): Promise<ScanResult> }   // mock: nasi-goreng result; every 2nd call returns low-confidence matches (prototype behavior)
interface SyncService  { push(entries): Promise<void> }          // mock no-op; drives nothing in v1
interface NudgeScheduler { schedule(time, enabled): void }       // mock no-op
```

Health values are no longer a mocked service: mobile reads the real pedometer through `useHealthToday()` (see 5.2) and the demo dataset carries its own designed numbers, detected via `isDemoData(entries)`.

`ScanResult = { dish, confidence: 'high'|'low', ingredients: {name, kcal}[], matches?: {name, kcal, likely}[] }`. Low-confidence results are never auto-logged.

Food scan gate (product rule 3/4): requires `hasAccount && online`; otherwise the scan row renders disabled with the exact reason copy and quick estimates remain.

### 4.5 Demo seed

`seedDemo()` produces the day-12 dataset the prototypes show (streak base 11 ending yesterday, historical week bars M/T/T/F/S, weight 72.4 with 30-day history, bests). Used by: the "I already have an account" path (mock sign-in, matches prototype), the web app (its prototype starts in this state), and dev verification against screenshots. A fresh onboarding never sees seeded data.

## 5. apps/mobile (Expo)

Expo SDK (latest), expo-router, TypeScript. Fonts: `@expo-google-fonts/archivo` (400-900 + italic 900). Dark UI per tokens; safe-area insets respected (tab bar, sheets).

### 5.1 Routes

```
app/_layout.tsx        fonts, stores hydration, onboarding redirect
app/onboarding/        welcome -> trackers -> rhythm -> health -> account  (stack, 5-segment progress bar on 2-5)
app/(tabs)/_layout.tsx custom 3-tab bar (Board / Trends / Goals, green fill active, white 40% inactive)
app/(tabs)/index.tsx   Board
app/(tabs)/trends.tsx  Trends (week/month segmented)
app/(tabs)/goals.tsx   Goals
app/session.tsx        live workout (full-screen)
app/run.tsx            GPS flow: primer | live | paused | summary (single route, mode from store)
app/scan.tsx           food scan: camera | analyzing | result | unsure
app/settings.tsx       Settings (canvas 10b)
```

Onboarding completion sets `onboarded`; picked trackers literally define which tiles exist (unpicked tiles never render). First board shows the coach-mark overlay once. Logging sheets (workout/meal/run/swim/weight) are a `LogSheet` component rendered over the Board (scrim + slide-up, drag handle), not routes. Class has no sheet; tile + logs directly.

### 5.2 v1 treatment of native capabilities

| Capability | v1 implementation | Real thing (deferred) |
|---|---|---|
| GPS run | expo-location foreground watch; distance from coordinates; auto-pause on no movement; press-and-hold END (prototype simplifies to tap; handoff says production must hold) | background-location module + Play policy review |
| Route map | react-native-maps: live polyline follows the run; summary and run detail fit the recorded route; routes stored as [lat,lng] pairs in the run entry payload (decimated to ~500 points), so they replicate through log_entries; quick logs keep the designed placeholder | dark map styling on Android (Google requires a custom style JSON) |
| Camera (scan) | expo-camera live viewfinder + shutter capture, expo-image-picker for FROM PHOTOS; captured photo shows on the result screens; placeholder fallback when no permission or hardware; analyze stays mocked | LLM backend for the actual estimate |
| Steps/sleep | `useHealthToday()`: real pedometer steps on iOS (expo-sensors, permission asked when Health is connected); Android and sleep render an honest dash until Health Connect / HealthKit land in a dev build; demo dataset shows its designed numbers | HealthKit / Health Connect |
| Nudges | expo-notifications one-shot rescheduled on log/toggle/time change (product rule 6); notification copy is a placeholder pending owner copy (open item 4) | owner copy + Android channel config |
| Sign-in | mock: Apple/Google/email buttons set `hasAccount` (auth screens are an undesigned open item) | real auth |

### 5.3 Components

`SlashMark` (SVG), `Wordmark`, `Tile` (+ hero Steps variant, logged/unlogged states, + bubble, long-press detail), `LogSheet`, `SheetRow`, `StreakChip`, `SyncPill`, `Toast`, `SegmentedControl`, `ProgressSegments`, `BarChart`/`LineChart`/`DotGrid` (hand-rolled SVG, pixel-matched to the trends cards), `Stepper`, `Toggle`, `CoachMark`. All icons are inline SVG components; no icon font.

## 6. apps/web (Vite + React)

Deliberately different shell, per handoff: light theme, sticky blurred top nav (wordmark, Board/Trends/Goals pill group, sync status, avatar), always-online framing, no offline states, no live session, no GPS (workout logging is template-pick with the phone-app note). Steps hero inverts to dark. Breakpoint 860px: >=860 four-column tiles + centered 420px modals; <860 two-column + bottom sheets. State: same core stores + `seedDemo()`; toasts use the web wording (`Synced · visible on your phone in a moment`). Settings entry: avatar (nav) opens nothing in v1 (not designed); avatar stays static.

## 7. apps/landing

Static page (plain HTML + CSS, no framework): green hero with phone-framed day-12 board, three feature cards, dark watch strip, web-app section with browser frame, CTA band, footer. Store badges remain placeholders (production uses official badge art). Responsive per the landing prototype.

## 8. Testing and verification

- `packages/core`: Vitest, TDD. Every derivation in 4.2 gets tests, including edge cases: streak across midnight/no-log day, health logs excluded from streak, scan removal + portion re-totals, first-log detection, goal segment caps, empty trends.
- Apps: visual verification against `screenshots/` (18 mobile, 3 web, 3 landing) and the interactive prototypes; mobile on iOS simulator, web/landing in browser. Web gets smoke tests for modal open/log/toast via Testing Library.
- Definition of done per surface: flows behave per prototype logic (extracted above) and screens match the captures.

## 9. Gaps and interim decisions (flagged, not silently invented)

1. **Settings entry point**: no entry is designed on the native Board. Interim: the Settings screen is fully built and reachable only via its route (`/settings` deep link, usable from dev tools); no visible entry is added to the pixel-final header without an owner decision.
2. **Auth screens** (open item 1): mock sign-in only; buttons work, no forms.
3. **Android back gesture** (open item 2): dismiss sheet -> back through tabs -> exit, implemented via router; adaptive icon deferred.
4. **Notification layout** (open item 4) and **LLM backend** (open item 5): interfaces only, as above.
5. Prototype's unrealistic GPS demo speed is ignored; real elapsed-time/coordinate math is used.

Findings from the build/verification pass (2026-07-02):

6. **Consistency card conflict**: the README lists a Consistency dot grid under mobile Trends, but its only mobile design lives in explorations turn 2 (rejected history, "do not implement"). The primary prototype's Trends has three cards and screenshot 17 confirms it. Implemented: three cards on mobile; the web app keeps its Consistency card (it is in the web prototype). Owner to confirm.
7. **Derived numbers vs static demo numbers**: the prototypes' demo values are internally inconsistent (a 12-day streak alongside a 5/7 week with two off days; "started at 76 kg" outside the 30-day window). All our surfaces derive from the seeded log history instead, so some displayed values differ from the static captures (active days, week-delta line, best step day, weight start). Rule follows product rule "no fake data".
8. **"vs last week" reads negative mid-week** with honest data (a partial week is compared against a full one). The prototype's static "▴ 1" hides this. Owner may prefer comparing completed weeks.
9. Verification method: core logic via unit tests (55); web via Testing Library + browser walk; mobile via simulator deep-link walk (a dev-only `/dev` seeding route exists for this). Full tap-through on simulator needs macOS assistive access, which was not granted in this session. Web sub-860px layout is covered by a component test asserting the bottom-sheet modal variant.
10. Follow-up round (same day): run detail screen (canvas 10a) added and wired to Run-tile long-press, with Delete as tombstone and Edit rendered but inert (no designed behavior); imperial units implemented as display-only conversion (entries always store kg/km; kcal from runs estimated at the canvas's 74 kcal/km ratio). Swim meters and kcal stay metric, since the Units row only specs kg·km / lb·mi.
11. Third round (same day): mobile persistence moved to SQLite with the sync-ready schema described in 4.3 (account sync itself stays deferred per owner instruction; the outbox and LWW merge are in place and tested). Nudges now schedule real local notifications; the notification copy reuses the coach mark's language and is flagged for owner copy. Settings rows are functional: My board and Weekly rhythm edit live settings by reusing the onboarding pickers as sub-screens (the canvas only designed the rows), and the nudge time opens a picker sheet. Undesigned sub-screen layouts are interpretations, flagged here rather than silently invented.
12. Fourth round (same day, "finished product" pass): the workout session is a real multi-exercise model. Templates carry actual exercise lists sized to the sheet metas (Upper body 6, Lower body 5, Full body 30 8); set labels are honest rep prescriptions upgraded to the user's last recorded top set; finishing saves per-exercise top sets into `WorkoutData.exercises`, from which the Trends best lift, the "last:" chip, and the sheet's "done Tue" metas all derive (`maxWeightKg`, `lastTopSet`, `bestLift`, `lastWorkoutDay`, `summarizeSession` in core, all unit-tested). Exercise names and rep prescriptions in the starter templates are interim content pending owner copy. Every invented number for real accounts is gone: mock health values render only on the demo dataset, the run screen's watch bpm is a dash, the class tile's "Yoga 18:30" booking is demo-only, and the weight tile shows a dash before a baseline. Health copy is platform-aware (Apple Health / Health Connect). Fixed paddings were replaced with safe-area-derived ones; Android hardware back returns to the Board before exiting; the local day rolls over without a reload (`useToday`); app icon, adaptive icon, splash, and favicon are generated from the slash mark. Hydration now also gates on settings rehydration (early writes were silently clobbered), and the nudge scheduler queues re-syncs instead of dropping changes that arrive mid-flight.

## 10. Build order

M1 scaffold + tokens + core (tested) -> M2 mobile app -> M3 web app -> M4 landing -> M5 verification pass against screenshots. Each milestone commits on `staging`.
