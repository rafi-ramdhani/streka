import { useState } from 'react';
import { View } from 'react-native';
import { logActivity } from '../core';
import { colors } from '../theme';
import { BigButton } from '../components/BigButton';
import { Pressable98 } from '../components/Pressable98';
import { Txt } from '../components/Txt';

// Proto:697-704: minus/plus 0.1 kg stepper around a big tabular number.
export function WeightSheet({ initial, onClose }: { initial: number; onClose: () => void }) {
  const [draft, setDraft] = useState(initial);
  const step = (d: number) => setDraft((v) => Math.round((v + d) * 10) / 10);

  const circle = (label: string, onPress: () => void) => (
    <Pressable98
      onPress={onPress}
      scaleTo={0.92}
      style={{
        width: 52,
        height: 52,
        borderRadius: 26,
        backgroundColor: 'rgba(255,255,255,.08)',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <Txt size={26} w={800}>
        {label}
      </Txt>
    </Pressable98>
  );

  return (
    <>
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 22,
          paddingVertical: 8,
        }}
      >
        {circle('−', () => step(-0.1))}
        <View style={{ alignItems: 'center', minWidth: 130 }}>
          <Txt size={46} w={900} ls={-0.03} tabular>
            {draft.toFixed(1)}
          </Txt>
          <Txt size={12} w={700} color={colors.mutedDark}>
            kg
          </Txt>
        </View>
        {circle('+', () => step(0.1))}
      </View>
      <BigButton
        label="SAVE WEIGHT"
        pad={15}
        onPress={() => {
          onClose();
          logActivity({
            tracker: 'weight',
            source: 'manual',
            data: { kind: 'weight', kg: draft },
            title: `Weight updated · ${draft.toFixed(1)} kg`,
          });
        }}
      />
    </>
  );
}
