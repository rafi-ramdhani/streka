import { router } from 'expo-router';
import type { ReactNode } from 'react';
import { View } from 'react-native';
import { BigButton, LinkButton } from '../../src/components/BigButton';
import { Check } from '../../src/components/Check';
import { ObFrame } from '../../src/components/ObFrame';
import { Txt } from '../../src/components/Txt';
import { healthAppName, requestHealthPermissions } from '../../src/health';
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

export default function Health() {
  const setHealth = useOnboarding((s) => s.setHealth);
  const go = (on: boolean) => {
    setHealth(on);
    if (on) void requestHealthPermissions();
    router.push('/onboarding/account');
  };

  return (
    <ObFrame
      step={4}
      headline={'Let your watch do\nthe boring logging'}
      sub={`Steps and sleep fill in automatically from ${healthAppName}. Nothing leaves your phone without sync on.`}
      footer={
        <>
          <BigButton label={`CONNECT ${healthAppName.toUpperCase()}`} onPress={() => go(true)} />
          <LinkButton label="Skip — log everything myself" onPress={() => go(false)} pad={8} />
        </>
      }
    >
      <View style={{ backgroundColor: colors.tile, borderRadius: 20, padding: 18, gap: 12 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <IconBox>
            <View
              style={{
                width: 18,
                height: 18,
                borderRadius: 9,
                borderWidth: 3,
                borderColor: colors.accentOnDark,
              }}
            />
          </IconBox>
          <View style={{ flex: 1 }}>
            <Txt size={14} w={900}>
              Steps & activity
            </Txt>
            <Txt size={11.5} w={600} color={colors.mutedDark}>
              auto, from watch or phone
            </Txt>
          </View>
          <Check width={14} />
        </View>
        <Divider />
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <IconBox>
            <View
              style={{
                width: 18,
                height: 10,
                borderRadius: 5,
                backgroundColor: colors.accentOnDark,
              }}
            />
          </IconBox>
          <View style={{ flex: 1 }}>
            <Txt size={14} w={900}>
              Sleep
            </Txt>
            <Txt size={11.5} w={600} color={colors.mutedDark}>
              auto, if your watch tracks it
            </Txt>
          </View>
          <Check width={14} />
        </View>
        <Divider />
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <IconBox>
            <View
              style={{
                width: 16,
                height: 16,
                borderRadius: 4,
                borderWidth: 3,
                borderColor: colors.mutedDark,
              }}
            />
          </IconBox>
          <View style={{ flex: 1 }}>
            <Txt size={14} w={900} color="#c7cec6">
              Workouts from watch
            </Txt>
            <Txt size={11.5} w={600} color={colors.mutedLight}>
              optional — you can log by hand
            </Txt>
          </View>
          <Txt size={11} w={800} color={colors.mutedDark}>
            OFF
          </Txt>
        </View>
      </View>
      <Txt size={12} w={600} color={colors.mutedLight} lineHeight={1.5}>
        No watch? Everything works with manual logging — that's what the big tiles are for.
      </Txt>
    </ObFrame>
  );
}
