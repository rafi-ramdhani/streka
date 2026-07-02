import * as Location from 'expo-location';
import { useEffect, useRef } from 'react';
import { useGpsRun } from '../stores/gpsRun';

const EARTH_RADIUS_KM = 6371;

function haversineKm(a: Location.LocationObjectCoords, b: Location.LocationObjectCoords): number {
  const dLat = ((b.latitude - a.latitude) * Math.PI) / 180;
  const dLon = ((b.longitude - a.longitude) * Math.PI) / 180;
  const la = (a.latitude * Math.PI) / 180;
  const lb = (b.latitude * Math.PI) / 180;
  const h =
    Math.sin(dLat / 2) ** 2 + Math.cos(la) * Math.cos(lb) * Math.sin(dLon / 2) ** 2;
  return 2 * EARTH_RADIUS_KM * Math.asin(Math.sqrt(h));
}

// Foreground GPS watcher for a live run: accumulates haversine distance and
// drives auto-pause (no movement for ~5 s) / auto-resume, per the handoff.
// Background tracking is a deferred native-module project (TAD 5.2).
export function useLocationRun(active: boolean) {
  const last = useRef<Location.LocationObjectCoords | null>(null);
  const stillSince = useRef<number | null>(null);

  useEffect(() => {
    if (!active) return;
    let sub: Location.LocationSubscription | null = null;
    let cancelled = false;

    (async () => {
      const { status } = await Location.getForegroundPermissionsAsync();
      if (status !== 'granted' || cancelled) return;
      sub = await Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.BestForNavigation,
          timeInterval: 1000,
          distanceInterval: 2,
        },
        (loc) => {
          const run = useGpsRun.getState();
          const speed = loc.coords.speed ?? 0;
          if (speed < 0.5) {
            stillSince.current ??= Date.now();
            if (Date.now() - stillSince.current > 5000) run.setAutoPaused(true);
          } else {
            stillSince.current = null;
            run.setAutoPaused(false);
          }
          if (last.current) run.addDistance(haversineKm(last.current, loc.coords));
          run.addPoint(loc.coords.latitude, loc.coords.longitude);
          last.current = loc.coords;
        },
      );
    })();

    return () => {
      cancelled = true;
      last.current = null;
      stillSince.current = null;
      sub?.remove();
    };
  }, [active]);
}
