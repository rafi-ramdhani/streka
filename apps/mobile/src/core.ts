import AsyncStorage from '@react-native-async-storage/async-storage';
import { createCore, createMockScan, mockHealth } from '@streka/core';

export const core = createCore({
  storage: {
    getItem: (name) => AsyncStorage.getItem(name),
    setItem: (name, value) => AsyncStorage.setItem(name, value),
    removeItem: (name) => AsyncStorage.removeItem(name),
  },
});

export const { useSettings, useLogs, useSync, useToast, showToast, logActivity } = core;

export const scanService = createMockScan();

// Health values switch between the fresh-onboarding and demo datasets until
// HealthKit / Health Connect lands.
export function healthFor(fresh: boolean) {
  return mockHealth(fresh);
}
