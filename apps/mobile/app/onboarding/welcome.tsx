import { router } from 'expo-router';
import { View } from 'react-native';
import { BigButton, LinkButton } from '../../src/components/BigButton';
import { SlashMark } from '../../src/components/SlashMark';
import { Txt } from '../../src/components/Txt';
import { enterAsReturning } from '../../src/stores/onboarding';
import { colors } from '../../src/theme';

export default function Welcome() {
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
      <View style={{ paddingBottom: 52, gap: 10 }}>
        <BigButton
          label="GET STARTED"
          bg={colors.ink}
          color={colors.white}
          onPress={() => router.push('/onboarding/trackers')}
        />
        <LinkButton
          label="I already have an account"
          color="rgba(11,28,16,.6)"
          onPress={() => {
            enterAsReturning();
            router.replace('/');
          }}
        />
      </View>
    </View>
  );
}
