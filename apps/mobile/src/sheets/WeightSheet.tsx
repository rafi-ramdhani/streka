import { useState } from 'react';
import { View } from 'react-native';
import { kgToLb, lbToKg, type Units } from '@streka/core';
import { logActivity } from '../core';
import { colors } from '../theme';
import { BigButton } from '../components/BigButton';
import { Pressable98 } from '../components/Pressable98';
import { Txt } from '../components/Txt';

// Proto:697-704: minus/plus 0.1 stepper around a big tabular number. The
// draft steps in the display unit; the log entry always stores kg.
export function WeightSheet({
  initial,
  units,
  onClose,
}: {
  initial: number; // kg
  units: Units;
  onClose: () => void;
}) {
  const imperial = units === 'imperial';
  const [draft, setDraft] = useState(imperial ? kgToLb(initial) : initial);
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
            {imperial ? 'lb' : 'kg'}
          </Txt>
        </View>
        {circle('+', () => step(0.1))}
      </View>
      <BigButton
        label="SAVE WEIGHT"
        pad={15}
        onPress={() => {
          onClose();
          const kg = imperial ? lbToKg(draft) : draft;
          logActivity({
            tracker: 'weight',
            source: 'manual',
            data: { kind: 'weight', kg },
            title: `Weight updated · ${draft.toFixed(1)} ${imperial ? 'lb' : 'kg'}`,
          });
        }}
      />
    </>
  );
}
