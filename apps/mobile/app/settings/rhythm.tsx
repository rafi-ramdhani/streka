import { View } from 'react-native';
import { useSettings } from '../../src/core';
import { Pressable98 } from '../../src/components/Pressable98';
import { SubHeader } from '../../src/components/SubHeader';
import { Txt } from '../../src/components/Txt';
import { useScreenPad } from '../../src/lib/screenPad';
import { colors } from '../../src/theme';

const DAY_OPTS = [
  { label: '2', v: 2 },
  { label: '3', v: 3 },
  { label: '4', v: 4 },
  { label: '5', v: 5 },
  { label: '6+', v: 6 },
] as const;

// Weekly rhythm (Settings): the onboarding day picker, editing the live goal.
export default function RhythmSettings() {
  const settings = useSettings();
  const pad = useScreenPad();

  return (
    <View style={{ flex: 1, backgroundColor: colors.appBg, paddingTop: pad.top }}>
      <View style={{ paddingHorizontal: 22, gap: 16 }}>
        <SubHeader title="Weekly rhythm" />
        <Txt size={13} w={600} color={colors.mutedDark}>
          Be honest, not heroic. You can raise it later.
        </Txt>
        <View style={{ flexDirection: 'row', gap: 8 }}>
          {DAY_OPTS.map((d) => {
            const on = settings.rhythmDays === d.v;
            return (
              <Pressable98
                key={d.v}
                onPress={() => settings.set({ rhythmDays: d.v })}
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
        <Txt size={12} w={600} color={colors.mutedLight} lineHeight={1.5}>
          Your rhythm sets your weekly goal. The streak itself is simple:{' '}
          <Txt size={12} w={700} color={colors.mutedDark} lineHeight={1.5}>
            log anything, any day, and it grows
          </Txt>
          .
        </Txt>
      </View>
    </View>
  );
}
