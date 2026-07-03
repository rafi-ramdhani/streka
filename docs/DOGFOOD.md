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

## Status (2026-07-03): done, installed on the phone

Every code item below is implemented and typechecked; the visible ones were verified on
the iOS simulator. The app was then built locally (no cloud) and installed to the
connected Android phone (`com.streka.app`, Android 16), and it launches standalone: the
logs show `ReactNativeJS: Running "main"` with the JS bundle embedded and no dev-server
connection, so it runs without Metro. See section 0 for how the build was done and how
to rebuild.

One thing is still yours because it needs your hands: **the on-device pass (item 9)**,
walking every flow on the phone.

Where an item was flagged "owner input", I took the sensible default and built it
(interim settings gear, kcal + step goal editors, run-primer honesty line); override any
of these and I will adjust. Done, per item: 1 settings gear · 2 honest scan gate ·
3 nudge channel + Expo Go gating · 4 sync-pill copy · 5 steps/sleep info taps ·
6 run-primer line · 7 goal editors · 8 JSON backup + restore.

---

## 0. Runtime: local standalone build (done)

Entries live in SQLite inside the running app's sandbox, so the standalone app and Expo
Go are separate stores. The standalone app installs as `com.streka.app` and starts with
an empty database, which is the clean-runtime choice; the backup/restore in item 8 is
how to carry data in later if wanted.

The build was done **entirely locally**, no EAS/cloud and no Expo account:

```sh
cd apps/mobile
npx expo prebuild --platform android        # generates the gitignored android/ project
cd android
printf 'sdk.dir=%s\n' "$HOME/Library/Android/sdk" > local.properties
./gradlew :app:assembleRelease -x lint      # ~12 min first time; APK embeds the JS bundle
```

The release variant self-signs with the debug keystore (Expo's template default), so no
keystore setup is needed for personal sideloading. Result:
`apps/mobile/android/app/build/outputs/apk/release/app-release.apk` (~134 MB universal
APK, all ABIs, unminified, fine for a personal build).

Install and launch on the connected phone:

```sh
adb install -r apps/mobile/android/app/build/outputs/apk/release/app-release.apk
adb shell monkey -p com.streka.app -c android.intent.category.LAUNCHER 1
```

To rebuild after a JS or native change: re-run `./gradlew :app:assembleRelease` and
`adb install -r ...`. The `android/` directory is gitignored (continuous native
generation), so it is a throwaway artifact; `expo prebuild` regenerates it from
`app.json` any time. For fast JS-only iteration during development, `pnpm --filter
mobile start` still serves Expo Go as before.

Toolchain used (all already on this machine): JDK 17 (Zulu), Android SDK platform 36 +
build-tools 36, NDK 27. Local notifications fire on this standalone build (unlike Expo
Go on Android).

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

**3. Nudge: make it real, or make its absence visible.** Both done.
- The Android notification channel is now created before scheduling
  (`setNotificationChannelAsync`, Android 8+ drops channel-less notifications) and the
  schedule passes `channelId`. On the standalone build the nudge can fire. Confirming
  it actually fires at the chosen time on a no-log day (and stays quiet once logged) is
  part of the on-device pass, item 9.
- For the Expo Go fallback, `src/nudges.ts` exposes `nudgesSupported`, and the Settings
  and Goals toggles render disabled with info text where nudges cannot fire (Expo Go on
  Android), instead of looking functional.

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

## 7. Status of the list

| # | Item | State |
|---|------|-------|
| 0 | Runtime: local standalone build | done, installed on the phone |
| 1 | Settings entry point (interim gear) | done |
| 2 | Gate food scan | done |
| 3 | Nudge channel + Expo Go gating | done (firing verified in item 9) |
| 4 | Sync pill copy | done |
| 5 | Steps/Sleep info taps | done |
| 6 | Run primer interim line | done |
| 7 | Goal editors (kcal, steps) | done |
| 8 | JSON backup + restore | done |
| 9 | Android device pass | yours, walk the flows on the phone |

## Day-1 checklist

The standalone app (`com.streka.app`) is already installed on the phone. To start:

1. Open Streka from the app drawer (not Expo Go, that is a separate copy).
2. Onboard fresh. Pick only trackers you will really log; on Android untick Steps and
   Sleep unless you want the gated tiles visible.
3. Set the nudge time (Settings gear, top-right) to when a reminder would actually help,
   and allow the notification permission when asked.
4. Check units, rhythm days, and the kcal goal in Settings.
5. Log the first real entry. Streak day 1 starts the clock.
6. Back up once at the end of week 1 (Settings, "Back up my data").
