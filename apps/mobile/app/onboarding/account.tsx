import { router } from 'expo-router';
import { View } from 'react-native';
import { BigButton, LinkButton } from '../../src/components/BigButton';
import { Check } from '../../src/components/Check';
import { ObFrame } from '../../src/components/ObFrame';
import { Txt } from '../../src/components/Txt';
import { enterApp } from '../../src/stores/onboarding';
import { colors } from '../../src/theme';

const BENEFITS = [
  'Backed up — new phone, same streak',
  'Web dashboard on any computer',
  'Still works fully offline',
];

export default function Account() {
  const finish = (hasAccount: boolean) => {
    enterApp(hasAccount);
    router.replace('/');
  };

  return (
    <ObFrame
      step={5}
      headline={"Don't lose the\nstreak you build"}
      sub="A free account backs everything up and syncs to the web app. Without one, your data lives only on this phone."
      footer={
        <LinkButton
          label="Not now — keep everything on this phone"
          onPress={() => finish(false)}
        />
      }
    >
      <View style={{ backgroundColor: colors.tile, borderRadius: 20, padding: 18, gap: 11 }}>
        {BENEFITS.map((b) => (
          <View key={b} style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
            <Check />
            <Txt size={13.5} w={700}>
              {b}
            </Txt>
          </View>
        ))}
      </View>
      <View style={{ gap: 8 }}>
        <BigButton
          label="Continue with Apple"
          bg={colors.white}
          color={colors.ink}
          pad={15}
          size={13.5}
          onPress={() => finish(true)}
        />
        <BigButton
          label="Continue with Google"
          bg="rgba(255,255,255,.08)"
          color={colors.white}
          pad={15}
          size={13.5}
          onPress={() => finish(true)}
        />
        <BigButton
          label="Use email"
          bg="rgba(255,255,255,.08)"
          color={colors.white}
          pad={15}
          size={13.5}
          onPress={() => finish(true)}
        />
      </View>
    </ObFrame>
  );
}
