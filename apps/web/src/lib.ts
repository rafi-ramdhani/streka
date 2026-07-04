import { useEffect, useState } from 'react';
import {
  dayOf,
  type LogData,
  type LogEntry,
  type LogSource,
  type Settings,
  type TrackerId,
} from '@streka/core';
import { core, webToast, webToastError } from './core';
import { pushEntry, pushSettings } from './sync';

// Single 860px breakpoint (handoff web spec).
export function useIsMobile(): boolean {
  const [mobile, setMobile] = useState(() => window.innerWidth < 860);
  useEffect(() => {
    const mq = window.matchMedia('(max-width: 859px)');
    const onChange = () => setMobile(mq.matches);
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);
  return mobile;
}

// The one web append path: optimistic local append, push to the account, then
// confirm honestly (success toast on server ack, error toast on failure).
export function logFromWeb(input: {
  tracker: TrackerId;
  source: LogSource;
  data: LogData;
  title: string;
}) {
  const { tracker, source, data, title } = input;
  const ts = Date.now();
  const entry: LogEntry = { id: crypto.randomUUID(), ts, day: dayOf(ts), tracker, source, data };
  core.useLogs.getState().append(entry);
  pushEntry(entry)
    .then(() => webToast(title))
    .catch(() => webToastError());
}

// Settings mutate the whole object, pushed under one sync key.
export function updateSettings(patch: Partial<Settings>) {
  core.useSettings.getState().set(patch);
  pushSettings(core.useSettings.getState()).catch(() => webToastError());
}

export function todayStr(): string {
  return dayOf(Date.now());
}

export function formatDateLine(): string {
  return new Date().toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  });
}
