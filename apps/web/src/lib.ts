import { useEffect, useState } from 'react';
import { dayOf, type LogData, type LogSource, type TrackerId } from '@streka/core';
import { core, webToast } from './core';

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

export function logFromWeb(input: {
  tracker: TrackerId;
  source: LogSource;
  data: LogData;
  title: string;
}) {
  // Same append path as mobile, but the toast always uses the web wording.
  const { tracker, source, data, title } = input;
  const ts = Date.now();
  core.useLogs.getState().append({
    id: crypto.randomUUID(),
    ts,
    day: dayOf(ts),
    tracker,
    source,
    data,
  });
  webToast(title);
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
