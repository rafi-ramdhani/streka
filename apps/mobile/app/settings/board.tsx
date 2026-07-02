import { View, useWindowDimensions } from 'react-native';
import { useSettings } from '../../src/core';
import { Pressable98 } from '../../src/components/Pressable98';
import { SubHeader } from '../../src/components/SubHeader';
import { Txt } from '../../src/components/Txt';
import { TRACKER_OPTIONS } from '../../src/stores/onboarding';
import { colors } from '../../src/theme';

// My board (Settings): the onboarding tracker grid, editing the live board.
// At least one tracker stays picked, mirroring the onboarding constraint.
export default function BoardSettings() {
  const settings = useSettings();
  const { width } = useWindowDimensions();
  const tileW = (width - 44 - 10) / 2;
  const pickedCount = Object.values(settings.picked).filter(Boolean).length;

  return (
    <View style={{ flex: 1, backgroundColor: colors.appBg, paddingTop: 64 }}>
      <View style={{ paddingHorizontal: 22, gap: 16 }}>
        <SubHeader title="My board" />
        <Txt size={13} w={600} color={colors.mutedDark}>
          These are your board. Change anytime.
        </Txt>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
          {TRACKER_OPTIONS.map(({ id, name }) => {
            const on = settings.picked[id];
            return (
              <Pressable98
                key={id}
                onPress={() => {
                  if (on && pickedCount === 1) return;
                  settings.set({ picked: { ...settings.picked, [id]: !on } });
                }}
                scaleTo={0.97}
                style={{
                  width: tileW,
                  backgroundColor: on ? 'rgba(23,194,95,.15)' : colors.tile,
                  borderWidth: 1.5,
                  borderColor: on ? colors.accent : 'transparent',
                  borderRadius: 18,
                  padding: 15,
                }}
              >
                <Txt size={15} w={900} color={on ? colors.white : '#c7cec6'}>
                  {name}
                </Txt>
                <Txt
                  size={11}
                  w={600}
                  color={on ? colors.accentOnDark : colors.mutedLight}
                  style={{ marginTop: 2 }}
                >
                  {on ? 'on your board ✓' : 'tap to add'}
                </Txt>
              </Pressable98>
            );
          })}
        </View>
      </View>
    </View>
  );
}
