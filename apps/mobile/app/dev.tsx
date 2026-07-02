import { Redirect, useLocalSearchParams } from 'expo-router';
import { enterApp, enterAsReturning, useOnboarding } from '../src/stores/onboarding';

// Dev-only state seeder for screenshot verification via deep links, e.g.
//   exp://127.0.0.1:8081/--/dev?state=demo
//   exp://127.0.0.1:8081/--/dev?state=fresh&coach=0
// Not part of the design; no-op outside dev builds.
export default function DevSeed() {
  const { state, coach } = useLocalSearchParams<{ state?: string; coach?: string }>();

  if (!__DEV__) return <Redirect href="/" />;

  if (state === 'demo') {
    enterAsReturning();
  } else if (state === 'fresh') {
    enterApp(false);
    if (coach === '0') useOnboarding.setState({ coachPending: false });
  }

  return <Redirect href="/" />;
}
