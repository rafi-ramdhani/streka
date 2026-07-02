import { useEffect, useState } from 'react';
import { AppState, Platform } from 'react-native';
import { isDemoData } from '@streka/core';
import { useLogs, useSettings } from './core';

// What the platform health source knows about today. null means "no data",
// rendered as an honest dash, never as an invented number.
export interface HealthToday {
  steps: number | null;
  sleep: { h: number; m: number } | null;
}

export const healthAppName = Platform.OS === 'android' ? 'Health Connect' : 'Apple Health';

const DEMO: HealthToday = { steps: 8246, sleep: { h: 7, m: 20 } };

async function readTodaySteps(): Promise<number | null> {
  // Real pedometer, iOS only: expo-sensors ships in Expo Go and CMPedometer
  // can answer "steps since midnight". Android needs Health Connect in a
  // development build, and sleep needs HealthKit; both stay null for now.
  if (Platform.OS !== 'ios') return null;
  try {
    const { Pedometer } = await import('expo-sensors');
    if (!(await Pedometer.isAvailableAsync())) return null;
    const perm = await Pedometer.getPermissionsAsync();
    if (!perm.granted) return null;
    const start = new Date();
    start.setHours(0, 0, 0, 0);
    const { steps } = await Pedometer.getStepCountAsync(start, new Date());
    return steps;
  } catch {
    return null;
  }
}

// Ask for pedometer access when the user connects Health; keeps the prompt
// tied to that choice instead of surprising them on the Board.
export async function requestHealthPermissions(): Promise<void> {
  if (Platform.OS !== 'ios') return;
  try {
    const { Pedometer } = await import('expo-sensors');
    if (!(await Pedometer.isAvailableAsync())) return;
    const perm = await Pedometer.getPermissionsAsync();
    if (!perm.granted && perm.canAskAgain) await Pedometer.requestPermissionsAsync();
  } catch {
    // Sensor unavailable; the Board shows a dash either way.
  }
}

export function useHealthToday(): HealthToday {
  const demo = useLogs((s) => isDemoData(s.entries));
  const connected = useSettings((s) => s.healthConnected);
  const [steps, setSteps] = useState<number | null>(null);

  useEffect(() => {
    if (demo || !connected) return;
    let live = true;
    const refresh = () => {
      void readTodaySteps().then((n) => {
        if (live) setSteps(n);
      });
    };
    refresh();
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') refresh();
    });
    return () => {
      live = false;
      sub.remove();
    };
  }, [demo, connected]);

  if (demo) return DEMO;
  return { steps: connected ? steps : null, sleep: null };
}
