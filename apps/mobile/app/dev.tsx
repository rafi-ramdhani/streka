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
  const { state, coach, nudge } = useLocalSearchParams<{
    state?: string;
    coach?: string;
    nudge?: string;
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
    }
    router.replace('/');
  }, [state, coach, nudge]);

  return <View style={{ flex: 1, backgroundColor: colors.appBg }} />;
}
