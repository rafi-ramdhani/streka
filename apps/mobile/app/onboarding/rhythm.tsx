import { router } from 'expo-router';
import { View } from 'react-native';
import { BigButton } from '../../src/components/BigButton';
import { ObFrame } from '../../src/components/ObFrame';
import { Pressable98 } from '../../src/components/Pressable98';
import { Toggle } from '../../src/components/Toggle';
import { Txt } from '../../src/components/Txt';
import { useOnboarding } from '../../src/stores/onboarding';
import { colors } from '../../src/theme';

const DAY_OPTS = [
  { label: '2', v: 2 },
  { label: '3', v: 3 },
  { label: '4', v: 4 },
  { label: '5', v: 5 },
  { label: '6+', v: 6 },
] as const;

export default function Rhythm() {
  const rhythmDays = useOnboarding((s) => s.rhythmDays);
  const setRhythm = useOnboarding((s) => s.setRhythm);
  const nudgeEnabled = useOnboarding((s) => s.nudgeEnabled);
  const toggleNudge = useOnboarding((s) => s.toggleNudge);

  return (
    <ObFrame
      step={3}
      headline={'How many active\ndays a week?'}
      sub="Be honest, not heroic. You can raise it later."
      footer={<BigButton label="CONTINUE" onPress={() => router.push('/onboarding/health')} />}
    >
      <View style={{ flexDirection: 'row', gap: 8 }}>
        {DAY_OPTS.map((d) => {
          const on = rhythmDays === d.v;
          return (
            <Pressable98
              key={d.v}
              onPress={() => setRhythm(d.v)}
              scaleTo={0.95}
              style={{
                flex: 1,
                alignItems: 'center',
                backgroundColor: on ? colors.accent : colors.tile,
                borderRadius: 16,
                paddingVertical: 18,
                shadowColor: on ? colors.accent : 'transparent',
                shadowOpacity: on ? 0.35 : 0,
                shadowRadius: 18,
                shadowOffset: { width: 0, height: 6 },
              }}
            >
              <Txt size={26} w={900} color={on ? colors.ink : '#c7cec6'}>
                {d.label}
              </Txt>
            </Pressable98>
          );
        })}
      </View>
      <View style={{ backgroundColor: colors.tile, borderRadius: 18, padding: 16, gap: 12 }}>
        <View
          style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}
        >
          <View style={{ flex: 1, paddingRight: 12 }}>
            <Txt size={14} w={900}>
              Nudge me
            </Txt>
            <Txt size={11.5} w={600} color={colors.mutedDark} style={{ marginTop: 1 }}>
              One quiet reminder on days you haven't logged
            </Txt>
          </View>
          <Toggle on={nudgeEnabled} onToggle={toggleNudge} />
        </View>
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            backgroundColor: colors.appBg,
            borderRadius: 12,
            paddingVertical: 11,
            paddingHorizontal: 14,
          }}
        >
          <Txt size={13} w={700} color={colors.mutedDark}>
            Around
          </Txt>
          <Txt size={15} w={900}>
            17:30
          </Txt>
        </View>
      </View>
      <Txt size={12} w={600} color={colors.mutedLight} lineHeight={1.5}>
        Your rhythm sets your weekly goal. The streak itself is simple:{' '}
        <Txt size={12} w={700} color={colors.mutedDark} lineHeight={1.5}>
          log anything, any day, and it grows
        </Txt>
        .
      </Txt>
    </ObFrame>
  );
}
