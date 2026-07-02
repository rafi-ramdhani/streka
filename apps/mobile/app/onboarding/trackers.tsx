import { router } from 'expo-router';
import { View, useWindowDimensions } from 'react-native';
import { BigButton } from '../../src/components/BigButton';
import { ObFrame } from '../../src/components/ObFrame';
import { Pressable98 } from '../../src/components/Pressable98';
import { Txt } from '../../src/components/Txt';
import { TRACKER_OPTIONS, useOnboarding } from '../../src/stores/onboarding';
import { colors } from '../../src/theme';

export default function Trackers() {
  const picked = useOnboarding((s) => s.picked);
  const toggle = useOnboarding((s) => s.toggle);
  const { width } = useWindowDimensions();
  const tileW = (width - 44 - 10) / 2;
  const pickedCount = Object.values(picked).filter(Boolean).length;

  return (
    <ObFrame
      step={2}
      headline={'What do you want\nto keep up?'}
      sub="These become your board. Change anytime."
      footer={
        <BigButton
          label={`CONTINUE · ${pickedCount} PICKED`}
          onPress={() => {
            if (pickedCount > 0) router.push('/onboarding/rhythm');
          }}
        />
      }
    >
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
        {TRACKER_OPTIONS.map(({ id, name }) => {
          const on = picked[id];
          return (
            <Pressable98
              key={id}
              onPress={() => toggle(id)}
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
                {on ? 'selected ✓' : 'tap to add'}
              </Txt>
            </Pressable98>
          );
        })}
      </View>
    </ObFrame>
  );
}
