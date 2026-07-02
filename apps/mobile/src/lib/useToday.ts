import { useEffect, useState } from 'react';
import { AppState } from 'react-native';
import { dayOf } from '@streka/core';

// Local day that rolls over at midnight and re-checks when the app returns
// to the foreground, so the Board and streak update without a reload.
export function useToday(): string {
  const [today, setToday] = useState(() => dayOf(Date.now()));

  useEffect(() => {
    const check = () =>
      setToday((prev) => {
        const d = dayOf(Date.now());
        return d === prev ? prev : d;
      });
    const timer = setInterval(check, 30_000);
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') check();
    });
    return () => {
      clearInterval(timer);
      sub.remove();
    };
  }, []);

  return today;
}
