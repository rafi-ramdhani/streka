# Streka. Road to daily use (offline v1)

Written 2026-07-03. Owner intent: use the app every day for one to two weeks on the
Android phone. "Fully working with offline mode" means two things:

1. Every feature that needs no backend works for real, with real data.
2. Every feature that does need a backend or a native module this build cannot ship
   is visibly gated by info text. Nothing silently fakes data and nothing looks
   functional while doing nothing.

Most of point 1 is already true (inventory in section 6). This document lists what is
left, ordered by how hard it blocks the dogfood.

---

## Status (2026-07-03): code items done

Every code item below is implemented, typechecked, and (where visible) verified on the
iOS simulator. What is left is yours, because it needs your hands, not mine:

- **Run the build (item 0).** `eas.json` and the Android/iOS package ids are in place;
  the actual `eas build` needs your Expo login. Steps in section 0.
- **The Android device pass (item 9).** Walk the flows on the real phone.

Where an item was flagged "owner input", I took the sensible default and built it
(interim settings gear, kcal + step goal editors, run-primer honesty line); override any
of these and I will adjust. Done, per item: 1 settings gear · 2 honest scan gate ·
3 nudge channel + Expo Go gating · 4 sync-pill copy · 5 steps/sleep info taps ·
6 run-primer line · 7 goal editors · 8 JSON backup + restore.

---

## 0. Decide the runtime before day 1

This is a data decision, not just a convenience one. Entries live in SQLite inside the
running app's sandbox. Expo Go and an installed APK are different sandboxes, so
switching mid-dogfood starts the streak from zero (there is no import yet, see item 8).
Pick once, before the first real log.

**Option A (recommended): EAS preview APK.** One cloud build, install the APK once.

- Launches without the laptop and without Metro. This is what "daily use" needs.
- Local scheduled notifications work on Android, so the nudge actually fires.
- Real home-screen icon, splash, standalone app.
- Cost: a free Expo account, an `eas.json` preview profile
  (`{"build": {"preview": {"distribution": "internal", "android": {"buildType": "apk"}}}}`),
  and `npx eas-cli build --platform android --profile preview` (~15 min in the queue).
- Shipping a fix during the dogfood means rebuilding, or adding `expo-updates` for
  over-the-air JS updates (optional, can be added in a later build).

**Option B: stay on Expo Go.** Zero build work, but the phone needs Metro running on
the laptop, on the same Wi-Fi, more or less every time the app opens. Nudges never
fire on Android in Expo Go (SDK 53+ removed the module there), and clearing Expo Go's
storage deletes the database. Workable for a weekend, painful for two weeks.

The task list below assumes Option A. Items marked *(Expo Go only)* apply only if
Option B is chosen.

---

## 1. Blockers: do before day 1

**1. Settings entry point on the phone.** Settings is currently reachable only by deep
link (TAD gap 1, owner decision pending). Without it there is no way on the device to
edit the board, weekly rhythm, nudge time, units, or export data. The Board header is
pixel-final, so the interim proposal is the least invasive one: a small gear glyph next
to the sync pill, flagged in the TAD as interim until the owner designs the real entry.
Effort: small. **Owner input: confirm placement.**

**2. Gate the food scan behind info text.** The camera and photo picker are real, but
`analyze()` is a mock that invents a dish and kcal numbers. One tap on the shutter
would write fiction into real meal data. Change: shutter and FROM PHOTOS lead to a
notice instead of the fake analyzing step, copy along the lines of "Reading plates
needs the AI service, which is not wired up in this build yet", with a TYPE IT IN
button that opens the manual meal sheet. The mock stays reachable through the dev
deep link (`scan?dev=result|unsure`) for screenshot verification. Effort: small.

**3. Nudge: make it real, or make its absence visible.**
- Option A path: add the Android notification channel
  (`setNotificationChannelAsync`, currently missing, Android 8+ wants one), build,
  and verify on the device that the scheduled nudge fires at the chosen time on a
  no-log day and stays quiet on a logged day. Effort: small plus one real-device test.
- *(Expo Go only)*: today the only signal that nudges do nothing on Android is a
  console warning the user never sees. The Settings nudge row and the Goals toggle
  look functional. Expose availability from `src/nudges.ts` and render the toggle
  disabled with info text ("Reminders need the installed build on Android").
  Effort: small.

**4. Sync pill toast copy.** Tapping the pill without an account says "add an account
later in Settings", but no account can be added anywhere (sign-in is honestly gated).
Align it with the sign-in notice: data stays on this phone, accounts arrive with sync.
Effort: trivial.

---

## 2. Info-text gates for platform gaps: do before day 1, cheap

**5. Steps and Sleep tiles on Android.** Both render honest dashes forever on this
build (pedometer is iOS-only, Health Connect needs a native module). Two cheap moves:

- Tapping the Steps hero or Sleep tile shows an info toast: automatic steps and sleep
  need Health Connect, which arrives with a future build.
- The real remedy already exists: Settings > My board can untick Steps and Sleep, and
  the tiles disappear. Worth doing during day-1 setup rather than staring at dashes
  for two weeks.

Effort: small.

**6. Run primer overpromise.** The designed primer text promises tracking stays alive
"when your screen is off mid-run", but tracking is foreground-only in this build; the
app compensates by keeping the screen awake during a run. Locking the phone mid-run
pauses tracking. Smallest honest fix that respects the designed copy: an added interim
line under the primer ("In this build, keep Streka on screen during the run; the app
keeps the screen awake for you"). Effort: trivial. **Owner input: OK to add a line
under designed copy?**

---

## 3. Data safety and daily-use gaps: strongly recommended

**7. Kcal and steps goals are hard-coded.** The meal budget (2,200 kcal) and step
goals (8,000/day) have no editor anywhere; every "% of goal" reads against defaults.
Either accept the defaults for the dogfood or add two stepper rows to Settings
(the nudge-time sheet is the pattern to reuse). Effort: small. **Owner input: are the
defaults right for you? If yes, defer the editors.**

**8. Backup that can come back.** Export exists (CSV via the share sheet) but there is
no import. Two weeks of streak data will live in one SQLite file in one app sandbox.
Recommended: add JSON export + import in Settings (full `log_entries` rows, id and
timestamps included, so restore preserves history exactly and survives a runtime
switch or reinstall). CSV stays for spreadsheets. Effort: medium-small. Fallback if
skipped: share the CSV somewhere safe once or twice a week, accepting that restore
would be manual re-entry.

**9. Real-device pass on the chosen runtime.** One evening of walking every flow on
the actual phone (fresh onboarding, each tile's sheet, a real GPS run outdoors, a
workout session, edit and delete through the day logs, units flip, day rollover past
midnight). The simulator walks covered iOS; the dogfood device is Android, where back
gestures, safe areas, and location behavior differ. Effort: one session, fix what falls
out.

---

## 4. Known quirks, accepted as-is (no work planned)

- "vs last week" on Trends reads negative mid-week because a partial week is compared
  against a full one (TAD gap 8). If it grates during the dogfood, the fix (compare
  completed weeks) is small. **Owner input: leave or fix?**
- Trends and Goals look sparse for the first week. Real data, honest charts.
- Steps never count toward the streak (product rule: health-sourced entries are not
  intentional logs). Expected, not a bug.
- The watch heart-rate slot on the run screen stays a dash, the class tile shows no
  booking, weight shows a dash before the first entry. All honest-data rules.
- Scan's "AI ESTIMATE ±20%" badge and portion logic remain dormant behind the item 2
  gate until the LLM backend exists.

---

## 5. Explicitly out of scope until after the dogfood

Unchanged deferrals: account sync backend (outbox, LWW, and `synced_at` are in place
and tested, nothing to do now), HealthKit / Health Connect, background GPS and the
Play-policy review it drags in, real auth screens, the LLM scan backend, Android dark
map styling, web and landing apps (untouched by the dogfood).

---

## 6. Already working offline (no work, listed so nothing gets re-litigated)

Fresh onboarding with tracker picking and rhythm; the Board with per-tracker tiles,
logging sheets, coach mark, streak chip and sync pill; live multi-exercise workout
sessions with per-exercise top sets feeding Trends bests; GPS runs with live route,
auto-pause, hold-to-end, route map, run detail; meal, weight, swim, and class logging;
edit and delete for every entry via long-press day logs (tile-framed summaries);
Trends and Goals derived from real history; midnight rollover without reload; units
display conversion; weekly rhythm and board editing from Settings; CSV export; SQLite
persistence with the sync-ready schema; safe-area layout, Android board-first back,
brand icon and splash.

---

## 7. Suggested order

| # | Item | Size | Needs owner call first? |
|---|------|------|------------------------|
| 0 | Runtime decision + preview APK build | S | yes (A or B) |
| 2 | Gate food scan | S | no |
| 4 | Sync pill copy | XS | no |
| 3 | Nudge channel + device test (or Expo Go gating) | S | follows #0 |
| 1 | Settings entry point | S | placement |
| 5 | Steps/Sleep info taps | S | no |
| 6 | Run primer interim line | XS | yes |
| 7 | Goal editors | S | defaults OK? |
| 8 | JSON export + import | M | no |
| 9 | Android device pass | session | follows all |

Everything except #8 and #9 is an hour-or-less item; the whole list is roughly one
working day plus the device pass.

## Day-1 checklist (once the list above is done)

1. Install the preview APK (or start Metro if Option B).
2. Onboard fresh. Pick only trackers you will really log; on Android untick Steps and
   Sleep unless you want the gated tiles visible.
3. Set the nudge time to when a reminder would actually help.
4. Check units, rhythm days, and (if built) kcal goal in Settings.
5. Log the first real entry. Streak day 1 starts the clock.
6. Export once at the end of week 1.
