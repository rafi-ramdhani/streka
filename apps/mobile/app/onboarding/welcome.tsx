import { router } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';
import { BigButton, LinkButton } from '../../src/components/BigButton';
import { SlashMark } from '../../src/components/SlashMark';
import { Txt } from '../../src/components/Txt';
import { useScreenPad } from '../../src/lib/screenPad';
import { colors } from '../../src/theme';

export default function Welcome() {
  const pad = useScreenPad();
  // No auth backend exists yet, so sign-in is honestly unavailable instead
  // of mock-succeeding into a fake synced account (TAD gap 2).
  const [notice, setNotice] = useState(false);

  return (
    <View style={{ flex: 1, backgroundColor: colors.accent, paddingHorizontal: 28 }}>
      <View style={{ flex: 1, justifyContent: 'center', gap: 18 }}>
        <SlashMark size={76} color={colors.ink} />
        <Txt size={40} w={900} italic ls={-0.03} lineHeight={1} color={colors.ink}>
          STREKA
        </Txt>
        <Txt size={30} w={900} ls={-0.02} lineHeight={1.15} color={colors.ink}>
          One slash a day.{'\n'}That's the whole app.
        </Txt>
        <Txt size={14} w={600} lineHeight={1.5} color="rgba(11,28,16,.7)">
          Log anything — a workout, a meal, a swim — and the day counts. Works offline, no
          account needed.
        </Txt>
      </View>
      <View style={{ paddingBottom: Math.max(pad.bottom, 52), gap: 10 }}>
        {notice ? (
          <Txt size={12.5} w={700} center lineHeight={1.4} color="rgba(11,28,16,.75)">
            Sign-in isn't in this build yet. Accounts arrive with sync, so for now everything
            stays on this phone.
          </Txt>
        ) : null}
        <BigButton
          label="GET STARTED"
          bg={colors.ink}
          color={colors.white}
          onPress={() => router.push('/onboarding/trackers')}
        />
        <LinkButton
          label="I already have an account"
          color="rgba(11,28,16,.6)"
          onPress={() => setNotice(true)}
        />
      </View>
    </View>
  );
}
