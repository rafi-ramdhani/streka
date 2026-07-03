import Constants from 'expo-constants';
import { Platform } from 'react-native';
import { dayOf, intentionalDays, isFirstLogOfDay, streak } from '@streka/core';
import { core } from './core';

// Product rule 6: one quiet notification per day, only on days with no log
// yet, at the user-chosen time. Implemented as a single one-shot scheduled
// for the next eligible moment, re-derived whenever logs or the nudge
// setting change. Notification copy is a placeholder pending owner copy
// (handoff open item 4); it reuses the coach mark's language.

type NotificationsModule = typeof import('expo-notifications');

// Whether local notifications can fire at all in this runtime. Expo Go on
// Android dropped expo-notifications in SDK 53, so nudges there are a no-op no
// matter the setting; the UI uses this to show the toggle as unavailable
// instead of pretending it works. The installed build supports them.
export const nudgesSupported = !(
  Platform.OS === 'android' && Constants.executionEnvironment === 'storeClient'
);

// Expo Go on Android ships without expo-notifications since SDK 53; even
// importing the module there can take down the app. Load it lazily and
// degrade to a no-op until a development build exists.
let notifications: NotificationsModule | null | undefined;

async function loadNotifications(): Promise<NotificationsModule | null> {
  if (notifications !== undefined) return notifications;
  const inExpoGo = Constants.executionEnvironment === 'storeClient';
  if (Platform.OS === 'android' && inExpoGo) {
    console.warn('streka: nudges need a development build on Android (Expo Go limitation)');
    notifications = null;
    return null;
  }
  try {
    notifications = await import('expo-notifications');
  } catch (err) {
    console.warn('streka: notifications unavailable', err);
    notifications = null;
  }
  return notifications;
}

// Re-entrancy: changes arriving while a sync is in flight queue one more
// pass, so the schedule always converges on the latest settings instead of
// silently dropping the update.
let applying = false;
let queued = false;

export async function syncNudgeSchedule(): Promise<void> {
  if (applying) {
    queued = true;
    return;
  }
  applying = true;
  try {
    const Notifications = await loadNotifications();
    if (!Notifications) return;

    // Android 8+ drops any notification without a channel. Create it once
    // (the call is idempotent) so the scheduled nudge actually surfaces.
    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('nudges', {
        name: 'Streak nudges',
        importance: Notifications.AndroidImportance.DEFAULT,
      });
    }

    const settings = core.useSettings.getState();
    await Notifications.cancelAllScheduledNotificationsAsync();
    if (!settings.onboarded || !settings.nudge.enabled) return;

    let perm = await Notifications.getPermissionsAsync();
    if (!perm.granted && perm.canAskAgain) {
      // Settings may have changed while we awaited; never prompt for a
      // nudge that is no longer wanted.
      if (!core.useSettings.getState().nudge.enabled) return;
      perm = await Notifications.requestPermissionsAsync();
    }
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
        body: `No log yet today. Day ${dayN} is one tap away.`,
        sound: false,
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DATE,
        date: next,
        channelId: 'nudges',
      },
    });
  } catch (err) {
    // Never let scheduling break the app.
    console.warn('streka: nudge scheduling unavailable', err);
  } finally {
    applying = false;
    if (queued) {
      queued = false;
      void syncNudgeSchedule();
    }
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
