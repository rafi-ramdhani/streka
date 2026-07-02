import * as Notifications from 'expo-notifications';
import { dayOf, intentionalDays, isFirstLogOfDay, streak } from '@streka/core';
import { core } from './core';

// Product rule 6: one quiet notification per day, only on days with no log
// yet, at the user-chosen time. Implemented as a single one-shot scheduled
// for the next eligible moment, re-derived whenever logs or the nudge
// setting change. Notification copy is a placeholder pending owner copy
// (handoff open item 4); it reuses the coach mark's language.

let applying = false;

export async function syncNudgeSchedule(): Promise<void> {
  if (applying) return;
  applying = true;
  try {
    const settings = core.useSettings.getState();
    await Notifications.cancelAllScheduledNotificationsAsync();
    if (!settings.onboarded || !settings.nudge.enabled) return;

    let perm = await Notifications.getPermissionsAsync();
    if (!perm.granted && perm.canAskAgain) perm = await Notifications.requestPermissionsAsync();
    if (!perm.granted) return;

    const entries = core.useLogs.getState().entries;
    const today = dayOf(Date.now());
    const [h = 17, m = 30] = settings.nudge.time.split(':').map(Number);
    const next = new Date();
    next.setHours(h, m, 0, 0);
    const loggedToday = !isFirstLogOfDay(entries, today);
    if (next.getTime() <= Date.now() || loggedToday) next.setDate(next.getDate() + 1);

    // Day number the nudge would rescue: streak as of the nudge day + 1.
    const days = intentionalDays(entries);
    const dayN = streak(days, dayOf(next.getTime())) + 1;

    await Notifications.scheduleNotificationAsync({
      content: {
        title: 'Keep the streak.',
        body: `No log yet today — day ${dayN} is one tap away.`,
        sound: false,
      },
      trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: next },
    });
  } catch (err) {
    // Expo Go has partial notification support; never let scheduling break the app.
    console.warn('streka: nudge scheduling unavailable', err);
  } finally {
    applying = false;
  }
}

let installed = false;

export function installNudgeScheduler(): void {
  if (installed) return;
  installed = true;
  void syncNudgeSchedule();
  core.useLogs.subscribe(() => void syncNudgeSchedule());
  core.useSettings.subscribe((s, prev) => {
    if (s.nudge !== prev.nudge || s.onboarded !== prev.onboarded) void syncNudgeSchedule();
  });
}
