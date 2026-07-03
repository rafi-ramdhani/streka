# Web dashboard: honest reconcile after the dogfood

Date: 2026-07-03. Status: approved design, ready for planning. Surface: `apps/web`.

## Problem

`apps/web` (the Vite + React dashboard) was built on 2026-07-02 against the original
spec and has not been touched since. Meanwhile two-plus weeks of dogfooding reshaped the
product on mobile: Health Connect was dropped, so steps and sleep became **manual**
trackers; custom workouts, custom run/swim inputs, and class types were added; backup and
export were removed. The shared `packages/core` stayed backward compatible, so web still
typechecks clean, but its screens now depict a product that no longer exists.

The clearest tells are watch/health data the product walked away from:

- Board shows a Steps hero labelled "AUTO FROM WATCH" with a hardcoded `8,246`, and a
  Sleep tile "AUTO ... from watch" with a hardcoded `7h 20m`. Neither reads from the
  store; neither is loggable.
- Goals shows "70,000 steps a week ... done, auto from watch".
- The demo seed feeds steps as `source: 'health'` (a concept the dogfood retired) and
  seeds no sleep at all.

The web reference screenshots (`design_handoff_streka/screenshots/0{1,2,3}-web.png`)
depict this watch-synced vision, so they are a partial verification target only: the
label deviations below are intentional departures from those images.

## Decisions locked during brainstorming

1. **Reconcile, not rebuild.** Update the existing dashboard to match where the product
   landed. Do not rebuild it.
2. **Honest, minimal reshape.** Keep the Board/Trends/Goals layout and the seeded demo
   values. Drop every "auto from watch" claim. Wire steps, sleep, and class to real
   manual logging like the other tiles. Deviate from the screenshots only in wording and
   in adding a log affordance.
3. **Web keeps its own mindset.** Web stays a deliberately separate surface: light theme,
   top nav, always-online framing, "quick logs and review" rather than live timed
   sessions or GPS. This reconcile preserves that separation; it does not port mobile UX
   onto web.
4. **No offline mode on web.** Web remains always-online *by framing*. No sync indicators,
   outbox, or offline states are added. "Honest" here means "stop faking watch/health
   data", not "make web work offline". The web toast wording is unchanged
   ("Synced, visible on your phone in a moment").
5. **Web-local blast radius.** All changes live in `apps/web`. `packages/core` logic, the
   `LogSource` union (`'health'` stays in the type), and the mobile app are left
   untouched. The mobile build is installed on a phone and stable; a web cleanup must not
   risk it. Seed honesty is handled inside `apps/web/src/core.ts` by post-processing the
   output of the shared `seedDemo()`, not by editing `core/seed.ts`.

## The honesty gap (inventory)

| # | Location | Problem | Fix |
|---|----------|---------|-----|
| 1 | `core/seed.ts:73-76` (consumed by web) | steps seeded as `source:'health'`; no sleep seeded | post-process in web seed: remap steps to `manual`, synthesize sleep |
| 2 | `web Board.tsx:218-255` | Steps hero "AUTO FROM WATCH", hardcoded `8,246`/`72%`/goal, not from store, not loggable | drive from today's logged steps vs `settings.stepsGoalDay`; make loggable; relabel "STEPS" |
| 3 | `web Board.tsx:358-363` | Sleep tile "AUTO ... from watch", hardcoded `7h 20m`, not loggable | drive from today's logged sleep or show a dash; make loggable; relabel "SLEEP" |
| 4 | `web Board.tsx:332-347` | Class tile fakes "Yoga 18:30 booked" (no booking in the model) | normal loggable Class tile (last class, tap + to log), real class name |
| 5 | `web Board.tsx:453` | workout log writes `mins: 0` and name suffix "· logged on web" | write a real duration; drop the "logged on web" suffix |
| 6 | `web Goals.tsx:37,153-154` | `weekSteps` starts from hardcoded `8246`; "done, auto from watch"; dead nudge toggle | sum real step entries; drop "auto from watch"; wire or remove the toggle |
| 7 | `web Trends.tsx:67,257` | `bestSteps` fallback `8246`; consistency grid keys off the `health` source | derive from real steps; base "logged day" on real entries without the health special-case |
| 8 | `web core.ts` seed | today has only run + 2 meals, so honest steps/sleep tiles read empty | seed a today steps entry and a today sleep entry (manual) |

## Design by surface

### Seed (`apps/web/src/core.ts`, web-local)

After calling `seedDemo(today)`, transform the returned entries before `replaceAll`:

- Remap the seeded steps entries from `source: 'health'` to `source: 'manual'` so they
  read as logs the demo user made (and so they count like any manual log, matching the
  post-dogfood rule).
- Synthesize a short sleep history (a handful of past days, roughly 7 to 8 hours, manual)
  so the Trends and tile values have real backing rather than a hardcoded string.
- Append a today steps entry (around 8,200) and a today sleep entry (around 7h 20m) so the
  board looks alive and every number traces to a real entry.

Net effect: the same demo dataset the screenshots show, with the fiction removed from the
data layer. No change to `core/seed.ts`.

### Board (`apps/web/src/sections/Board.tsx`)

- **Steps hero** keeps its signature dark inverted card. Label becomes "STEPS" (no "auto
  from watch"). Value and percent come from today's logged steps against
  `settings.stepsGoalDay`. The card becomes loggable (tap to add a step count); when
  nothing is logged today it shows a dash, consistent with the honest-dash rule.
- **Sleep tile** label becomes "SLEEP". Value from today's logged sleep, or a dash when
  none. Loggable.
- **Class tile** drops the fake booking. It becomes a normal loggable tile: a "Class"
  label, a last-class hint, and a tap-to-log affordance that records a real class name.
- **Workout log** stops appending "· logged on web" and writes a real duration for the
  chosen template.
- `todayBoard` in core does not currently return steps or sleep. To stay web-local, the
  Board computes today's steps and sleep from `entries` with small local selectors (the
  same shape Trends and Goals already use for steps). Core is not extended.

### Logging modals (`apps/web/src/sections/Board.tsx`, `components/Modal.tsx`)

Add `steps`, `sleep`, and `class` to the modal set, reusing the two input patterns the
board already has (`OptionRow` preset lists and the weight-style stepper):

- Steps: a short list of preset counts as `OptionRow`s (for example a light, average, and
  active day), matching the meal/run/swim modals.
- Sleep: a stepper in the weight-tile style, for hours and minutes.
- Class: an `OptionRow` list of the class types the product now supports.

No mobile-style free numeric keypad; that stays a phone feature. Keeps web's "quick logs"
framing; does not import mobile's custom-input UX.

### Trends (`apps/web/src/sections/Trends.tsx`)

- Remove the hardcoded `8246` step fallbacks now that real step entries back the numbers.
- Keep the consistency grid, but base "logged day" on real (non-deleted) entries without
  the `source === 'health'` special-case, since no health source is produced anymore.
- Layout is unchanged and still matches `02-web.png` structurally.

### Goals (`apps/web/src/sections/Goals.tsx`)

- Remove "· auto from watch".
- `weekSteps` sums real step entries with no hardcoded `8246` base.
- Remove the dead steps-goal nudge toggle. It currently flips a local `useState` that
  drives nothing, and the product has only the single daily "days you haven't logged"
  nudge (no per-goal nudge to bind to). The weight goal is unchanged.

## Verification

- Run the Vite dev server and walk Board, Trends, and Goals in the browser at both
  breakpoints (>= 860 four-column, < 860 two-column with bottom sheets).
- Compare against `screenshots/0{1,2,3}-web.png`, accepting the intentional label
  deviations (no "auto from watch", steps/sleep now show a log affordance).
- Log a step count, a sleep entry, and a class from the board; confirm the tiles, Trends,
  and Goals update from the real entries and the web toast fires with the web wording.
- Keep the existing Testing Library smoke tests green; update the ones that assert the old
  "auto from watch" copy.
- Typecheck: `pnpm --filter web exec tsc --noEmit`.

## Out of scope (unchanged)

GPS and live timed sessions on web; mobile-style custom numeric inputs; the landing app;
account sync; offline mode on web; any change to `packages/core` logic, the `LogSource`
type, or the mobile app.

## Files expected to change

- `apps/web/src/core.ts` (seed honesty, web-local)
- `apps/web/src/sections/Board.tsx` (steps hero, sleep, class, workout payload, new modals)
- `apps/web/src/sections/Trends.tsx` (step fallbacks, consistency source)
- `apps/web/src/sections/Goals.tsx` (steps wording and base, nudge toggle)
- `apps/web/src/components/Modal.tsx` (if new option shapes are needed)
- `apps/web/src/App.test.tsx` (update copy assertions, add coverage for the new logs)

No changes to `packages/core`, `apps/mobile`, or `apps/landing`.
