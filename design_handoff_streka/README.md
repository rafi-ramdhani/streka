# Handoff: Streka — Fitness Tracker (v1)

## Overview

Streka is a **free fitness tracker for casual habit-builders**. The core loop: the home screen ("the Board") is a grid of tracker tiles — one tap logs an activity, and any log keeps the daily streak alive. Trackers: workouts (with live sessions), GPS runs, steps, meals (incl. AI food scan), weight, swimming, classes, sleep.

Target stack (per the product owner): **React Native** for iOS + Android, plus a **web app** (React) and a **marketing landing page**. Offline-first on mobile with silent sync to an optional registered account.

## About the Design Files

The files in this bundle are **design references created in HTML** — interactive prototypes showing intended look and behavior, **not production code to copy directly**. The task is to **recreate these designs in the target codebase** (React Native for mobile, React for web) using its established patterns and libraries. The prototypes encode the interaction logic precisely — click through them before implementing.

The `.dc.html` files open directly in a browser. `ios-frame.jsx` is a device-frame shell used by the prototypes for presentation only — do not implement it.

## Fidelity

**High-fidelity.** Colors, typography, spacing, radii, and copy are final. Recreate pixel-perfectly. The only placeholders are: map/route renders, food photos, camera viewfinder, store badges, and the user avatar — marked with striped backgrounds and monospace labels.

## Files

| File | What it is |
|---|---|
| `Streka Prototype.dc.html` | **The primary reference.** Fully interactive native mobile app: onboarding → board → all logging flows, live workout, GPS run, food scan, trends, goals, offline simulation. |
| `Streka Web App.dc.html` | Interactive responsive web dashboard (desktop + mobile web). |
| `Streka Landing.dc.html` | Marketing landing page (responsive). |
| `Fitness App Explorations.dc.html` | Design history canvas: brand exploration, rejected directions, and static screens not in the prototype — **run summary (10a), settings (10b), empty Trends (10c), GPS permission primer / live / paused (11a–c), food scan screens (12a–c)**. Turns are numbered; newest at top. Earlier turns (1–8) are history — do not implement from them. |
| `screenshots/` | Reference captures. `NN-mobile.png` walks the full native flow in order: 01 welcome → 02 trackers → 03 rhythm → 04 health → 05 account → 06 board + coach mark → 07 day-1 board → 08 meal sheet → 09 scan camera → 10 scan result → 11 board after meal log → 12 run sheet → 13 GPS primer → 14 live run → 15 run summary → 16 board → 17 trends → 18 goals. `NN-web.png`: board / trends / goals. `NN-landing.png`: top-to-bottom. |
| `support.js` + `ios-frame.jsx` | Runtime + presentation shell so the HTML files open in a browser. Not part of the design. |

## Design Tokens

**Colors**
- Accent green: `#17C25F` (darker on-light variant: `#17A253`; bright on-dark variant: `#3FE07F`)
- Ink (on green): `#0B1C10`
- App background (native, dark): `#131712`; card/tile surface: `#1D231C`
- Web/light background: `#F5F7F3`; light cards: `#FFFFFF` with `1px rgba(0,0,0,.06)` border
- Muted text (dark): `#8A938A`; muted text (light): `#6B736B`
- Warning/amber (paused, low-confidence): `#FFB74D` on `rgba(255,183,77,.15)`
- Danger (end run, sign out): `#E0654F`
- On-dark dividers: `rgba(255,255,255,.06–.12)`

**Typography** — single family: **Archivo** (Google Fonts), weights 400–900.
- Wordmark: Archivo **italic 900**, letter-spacing −0.03em, always "STREKA" uppercase
- Hero numbers: 900, −0.03em, 38–96px, `font-variant-numeric: tabular-nums` on timers/counters
- Tile titles: 22px/900; tile labels: 11px/700 uppercase, letter-spacing .06em; body: 13–15px/600–800
- Minimum text size: 10px (labels only)

**Shape & spacing**
- Tile/card radius: 20–22px; sheets/modals: 28px top radius; buttons: 14–16px; pills/chips: 999px
- Grid gap: 10–12px; screen padding: 18–24px
- Hit targets ≥ 44px everywhere

**Brand mark** — a single rounded bar ("the slash") rotated 32°. SVG: `<rect x="16" y="-8" width="14" height="62" rx="7" transform="rotate(32 23 23)"/>` in a 46×46 viewBox. Dark mark on green tile (app icon), green mark on dark surfaces. App icon ramp is on the explorations canvas, turn 8. Tagline: **"Keep the streak."**

## Product Rules (settled decisions — do not re-litigate)

1. **Streak = consecutive days with at least one log** (daily, not weekly). Any tracker counts. Steps/sleep arriving automatically do NOT count — only intentional logs.
2. **Weekly rhythm** (2–6+ active days/week, chosen in onboarding, default 3) is a **goal**, not the streak rule. It drives the Goals tab and nudge scheduling.
3. **Offline is invisible**: everything works offline; the only indicators are the sync pill (gray dot + "Offline") and toast suffixes ("Saved — will sync when online"). No pending badges, no blocking spinners. **Exception: food scan requires account + connection** (see below).
4. **Account is optional** — a pitch, not a gate. Without one: sync pill reads "On this phone", data is local-only, food scan is locked. Sign-in options: Apple, Google, email.
5. **Sync conflict rule** (spec note): last-write-wins per log entry; log entries are immutable events keyed by client-generated UUID + timestamp, so conflicts are rare by construction.
6. **Nudges**: one quiet notification per day, only on days with no log yet, at the user-chosen time (default 17:30).

## Screens — Native App (see `Streka Prototype.dc.html`)

### Onboarding (6 steps, < 1 minute)
1. **Welcome** (green): "One slash a day. That's the whole app." CTAs: GET STARTED / "I already have an account".
2. **Pick trackers** (2-col grid, multi-select, 8 options, 4 preselected) — **the selection literally builds the Board**; tiles for unpicked trackers never render.
3. **Weekly rhythm**: day count picker (2/3/4/5/6+, default 3) + nudge toggle + time.
4. **Health/watch** (skippable): explains steps & sleep auto-fill via HealthKit / Health Connect; "workouts from watch" toggle default OFF; skip = manual logging, tiles show "phone only" / "connect Health to auto-fill".
5. **Account** (skippable): benefits list; Apple/Google/email; "Not now — keep everything on this phone".
6. **First board**: day-1 state (empty tiles, "nothing yet"), single coach-mark overlay: "Tap any tile's + to log it."

A 5-segment progress bar tops screens 2–5.

### The Board (home tab, dark)
- Header: green slash + STREKA wordmark, date line, streak chip (slash + number), **sync pill** (3 states: green "Synced" / gray "Offline" / gray "On this phone" when no account; in the prototype, tapping it simulates offline).
- **Steps hero tile** (full width, auto): big count, % of goal, progress bar.
- Tiles (2-col): Workout, Meals, Run, Weight, Swim, Class, Sleep (full-width, auto). Unlogged tiles show "—" + last-activity hint + a `+` bubble; logged Workout tile flips to solid green "Logged ✓". First log of the day fires a toast: "Streak kept — day N".
- Footer hint: "Tap a tile to log · hold for details" (hold → detail view, e.g. run summary).

### Logging sheets (bottom sheets, `#1D231C`, drag handle)
- **Workout**: 3 recent templates (name, meta, play button) → starts a live session; "Start empty"; "Log past workout" (logs instantly).
- **Meal**: **"Scan your food"** row on top (see Food Scan) + 3 quick estimates (Light 300 / Regular 550 / Big 800 kcal) + note "Quick estimates — you can refine portions later".
- **Run**: **"Start GPS run"** (green, primary) + 3 quick logs (2K / 5K / same as last time) + note "Quick logs are manual — GPS tracks live, even with the screen off".
- **Swim**: 400 / 800 / 1,200 m. **Weight**: −/+ stepper (0.1 kg) + SAVE. **Class**: no sheet — tile tap logs attendance directly.

### Live workout session (full-screen)
Big mm:ss timer (tabular nums), exercise card with tappable set rows (empty circle → green check; next undone row highlighted "TAP WHEN DONE"), + Add set, next-exercise preview, Discard / FINISH WORKOUT. Sessions save set-by-set locally (offline-safe).

### GPS run flow
1. **Permission primer** (first use only): "Where you run stays yours" — 3 honest bullets (on-device route, why "Always Allow", GPS only during runs). ENABLE LOCATION / "Not now — I'll track runs with my watch".
2. **Live run**: GPS signal indicator, 88–96px distance, time / pace / bpm-from-watch cards, live-route map area, controls: pause-resume (84px green circle) + END (58px, red-tinted; production should require a **press-and-hold** — the prototype simplifies to tap).
3. **Auto-paused**: stats dim to 50%, amber "AUTO-PAUSED — you stopped moving" chip, pace shows "—", resume is automatic on movement (manual button too).
4. **Run summary**: distance hero, time/pace/kcal cards, route map, "Counted for <date> — streak day N" confirmation, Edit/Delete. Also used for runs imported from the watch via Health.
- Engineering: requires a background-location native module and a Google Play background-location policy review. Prototype simulates distance at unrealistic demo speed — ignore the rate.

### Food scan (LLM: dish, ingredients, calories)
- **Gate: registered account + online.** Otherwise the scan row is grayed with "needs an account" / "needs a connection" and quick estimates remain.
- **Camera**: framing corners, "Get the whole plate in frame — sides too", shutter, FROM PHOTOS, TYPE INSTEAD.
- **Analyzing**: brief full-screen state (~seconds).
- **Result**: dish name; **kcal as a range** (±10% around the total, e.g. "540–660") — never a single fake-precise number; permanent "AI ESTIMATE · ±20%" chip; Small/Medium/Large portion control (multipliers .7 / 1 / 1.3) rescales everything; ingredient rows with per-item kcal, tap to remove (strikethrough + re-total); + Add ingredient; Retake / LOG ~N KCAL.
- **Low confidence**: amber "NOT SURE" chip, 3 closest matches (first marked "most likely", one tap logs it), Retake / Type it in. **Never auto-log a low-confidence guess.**

### Trends tab
Week/Month segmented control. Cards: Active days (big "5 / 7", 7 day bars; month = 4 week bars) with vs-last-period delta; Weight (current, 30-day delta, line chart); Bests this month (bench / longest run / best step day); Consistency (3-week dot grid, on explorations canvas).
**Empty state (day 2, canvas 10c)**: real logged days as green bars, remaining days as dashed outlines; weight card explains it needs a second entry; Bests card: "Charts get good after a week — you're 2 days in." **No fake data, ever.**

### Goals tab
- "Active N days a week" (from onboarding rhythm): segmented progress bar (N segments), completes as days are logged, per-goal nudge toggle.
- "70,000 steps a week": % progress, auto from watch.
- Weight target: progress from start weight, "on pace for <month>".
- "+ New goal" dashed row.

### Settings (canvas 10b)
Profile header (avatar, name, sync status) · My board (tracker management) · Weekly rhythm · Nudge (toggle + time) · Apple Health / Health Connect status · Units (kg·km / lb·mi) · **Export my data** ("Everything as CSV — it's yours") · Sign out (red, with reassurance copy) · version footer.

### Tab bar
3 tabs: Board (square icon) / Trends (outlined square) / Goals (circle). Active = green fill, inactive = white at 40% opacity. Respect safe-area insets.

## Web App (see `Streka Web App.dc.html`)

Deliberate differences from native — **do not port the native shell to web**:
- **Light theme** (`#F5F7F3` bg, white cards) and **top nav** (wordmark + Board/Trends/Goals pill group + "Synced · iPhone, just now" + avatar), sticky with blur.
- **No live workout session and no GPS** on web — workout logging is template-pick only, with the note "Live sessions with a timer run on the phone app".
- Always-online framing; no offline states.
- Responsive: ≥860px = 4-column tile grid, 2-column card rows, centered modals (420px); <860px = 2-column tiles, single column, modals become bottom sheets. Breakpoint: **860px**.
- Steps hero inverts to dark (`#131712`) for hierarchy on the light page.

## Landing Page (see `Streka Landing.dc.html`)

Green hero (nav, "ONE SLASH A DAY." in italic 900 at clamp(52–92px), store buttons + "Open web app", day-12 board in a phone) → 3 feature cards (Tap. Logged. / Offline isn't an edge case / One slash a day) → dark watch strip (auto vs manual) → web-app section with browser-framed dashboard → green CTA band ("KEEP THE STREAK.") → minimal footer. Store badges are placeholders — use official Apple/Google badge art in production.

## State Management (reference: prototype logic)

Key state the prototype encodes (mirror the shape, not the implementation):
- `onboarding`: phase, picked trackers, rhythmDays, nudge, healthConnected, hasAccount
- `board`: per-tracker logged-today values (workout {name, mins}, mealsKcal, runKm, swimM, weight, classDone), steps/sleep from Health
- `streak`: base + today-logged derivation; first-log-of-day triggers streak toast
- `sync`: online, hasAccount → 3-state indicator + toast suffix wording
- `session`: startTs, sets[{label, done}], elapsed
- `gpsRun`: primed, mode (live/paused/summary), startTs, pausedTotal
- `foodScan`: mode (camera/analyzing/result/unsure), portion, removed[], derived total + range

## Assets

- All icons are inline geometric SVGs (slash mark, checks, chevrons, play/pause) — recreate as components; no icon font.
- Font: Archivo via Google Fonts (bundle in the RN app).
- Placeholders to replace with real implementations: map/route (use a map SDK), food photo, camera, store badges, avatar.

## Open Items (flagged, not designed — ask the owner, don't invent)

1. **Auth screens**: email sign-in / sign-up / recovery flows are not designed.
2. **Android adaptive icon**: slash-on-green needs foreground-layer safe margins; not yet specced. Android back gesture: dismiss sheet → back through tabs → exit.
3. **Class booking**: v1 is log-only ("tap + when done"); the booking itself happens outside the app.
4. **Notification designs**: nudge copy exists in-app; the actual push notification layout/copy is not designed.
5. **LLM scan backend**: needs a vision-capable model server-side; photo upload → {dish, confidence, ingredients[{name, kcal}], portion baseline}. Low-confidence threshold and the "closest matches" list come from the model response.
