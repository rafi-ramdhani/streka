import { router } from 'expo-router';
import type { ReactNode } from 'react';
import { View } from 'react-native';
import { BigButton } from '../../src/components/BigButton';
import { Check } from '../../src/components/Check';
import { ObFrame } from '../../src/components/ObFrame';
import { SlashMark } from '../../src/components/SlashMark';
import { Txt } from '../../src/components/Txt';
import { useOnboarding } from '../../src/stores/onboarding';
import { colors } from '../../src/theme';

function IconBox({ children }: { children: ReactNode }) {
  return (
    <View
      style={{
        width: 42,
        height: 42,
        borderRadius: 12,
        backgroundColor: 'rgba(255,255,255,.08)',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      {children}
    </View>
  );
}

function Divider() {
  return <View style={{ height: 1, backgroundColor: 'rgba(255,255,255,.07)' }} />;
}

function Line({ title, sub }: { title: string; sub: string }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
      <IconBox>
        <Check width={16} />
      </IconBox>
      <View style={{ flex: 1 }}>
        <Txt size={14} w={900}>
          {title}
        </Txt>
        <Txt size={11.5} w={600} color={colors.mutedDark}>
          {sub}
        </Txt>
      </View>
    </View>
  );
}

// Onboarding step 4 (was "connect your watch"). This build has no automatic
// health source, so it now sets expectations for the manual, on-device model
// instead. The step is kept so the flow and progress bar are unchanged.
export default function Health() {
  const setHealth = useOnboarding((s) => s.setHealth);
  const go = () => {
    setHealth(false);
    router.push('/onboarding/account');
  };

  return (
    <ObFrame
      step={4}
      headline={'Everything stays\non this phone'}
      sub="No account needed to start. Tap a tile, it is logged. Your streak lives right here."
      footer={<BigButton label="CONTINUE" onPress={go} />}
    >
      <View style={{ backgroundColor: colors.tile, borderRadius: 20, padding: 18, gap: 12 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <IconBox>
            <SlashMark size={18} color={colors.accentOnDark} />
          </IconBox>
          <View style={{ flex: 1 }}>
            <Txt size={14} w={900}>
              One tap to log
            </Txt>
            <Txt size={11.5} w={600} color={colors.mutedDark}>
              every tile logs in a tap, no forms
            </Txt>
          </View>
        </View>
        <Divider />
        <Line title="Private by default" sub="your data never leaves this device" />
        <Divider />
        <Line title="Streak first" sub="one log a day keeps it alive" />
      </View>
      <Txt size={12} w={600} color={colors.mutedLight} lineHeight={1.5}>
        Steps and sleep are logged by hand too. Accounts and cross-device sync arrive later.
      </Txt>
    </ObFrame>
  );
}
