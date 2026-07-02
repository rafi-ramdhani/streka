import { router, useLocalSearchParams } from 'expo-router';
import { useEffect } from 'react';
import { View } from 'react-native';
import { core } from '../src/core';
import { colors } from '../src/theme';
import { enterApp, enterAsReturning, useOnboarding } from '../src/stores/onboarding';
import { useSession } from '../src/stores/session';

// Dev-only state seeder for screenshot verification via deep links, e.g.
//   exp://127.0.0.1:8081/--/dev?state=demo
//   exp://127.0.0.1:8081/--/dev?state=fresh&coach=0
// nudge=0 keeps the reminder off so no permission prompt blocks automation.
// Not part of the design; no-op outside dev builds.
export default function DevSeed() {
  const { state, coach, nudge, log } = useLocalSearchParams<{
    state?: string;
    coach?: string;
    nudge?: string;
    log?: string;
  }>();

  useEffect(() => {
    if (__DEV__) {
      // Seeding a state means starting over; a live session from the
      // previous state would leak through otherwise.
      if (state && useSession.getState().active) useSession.getState().discard();
      if (state === 'demo') {
        enterAsReturning();
      } else if (state === 'fresh') {
        core.useLogs.getState().replaceAll([]);
        enterApp(false);
        if (coach === '0') useOnboarding.setState({ coachPending: false });
      }
      if (nudge === '0') {
        const s = core.useSettings.getState();
        core.useSettings.setState({ nudge: { ...s.nudge, enabled: false } });
      }
      // log=today drops a few entries on today's board so the day-log and
      // edit flows can be walked without tapping through the sheets.
      if (log === 'today') {
        const add = (tracker: Parameters<typeof core.logActivity>[0]['tracker'], data: Parameters<typeof core.logActivity>[0]['data']) =>
          core.logActivity({ tracker, source: 'manual', data, title: 'dev' });
        add('meals', { kind: 'meal', kcal: 550, label: 'Lunch' });
        add('meals', { kind: 'meal', kcal: 320 });
        add('running', { kind: 'run', km: 4.2, time: '23:14', pace: '5:32' });
        add('weight', { kind: 'weight', kg: 72.4 });
        add('workouts', {
          kind: 'workout',
          name: 'Upper body',
          mins: 45,
          exercises: [
            { name: 'Bench press', topSet: '60 kg × 8' },
            { name: 'Overhead press', topSet: '40 kg × 8' },
            { name: 'Lat pulldown', topSet: '55 kg × 10' },
          ],
        });
      }
    }
    router.replace('/');
  }, [state, coach, nudge, log]);

  return <View style={{ flex: 1, backgroundColor: colors.appBg }} />;
}
