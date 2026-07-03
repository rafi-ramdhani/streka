import { useState } from 'react';
import { View } from 'react-native';
import { logActivity } from '../core';
import { BigButton } from '../components/BigButton';
import { SheetInput } from './SheetInput';

// Manual sleep entry. No automatic source in this build, so the user types last
// night's hours and minutes; the board shows the latest logged value.
export function SleepSheet({
  onClose,
  initial,
}: {
  onClose: () => void;
  initial?: { h: number; m: number };
}) {
  const [h, setH] = useState(initial ? String(initial.h) : '');
  const [m, setM] = useState(initial ? String(initial.m) : '');
  const hn = Math.round(parseFloat(h || '0'));
  const mn = Math.round(parseFloat(m || '0'));
  const ok =
    Number.isFinite(hn) &&
    Number.isFinite(mn) &&
    hn >= 0 &&
    hn <= 24 &&
    mn >= 0 &&
    mn < 60 &&
    hn + mn > 0;

  return (
    <>
      <View style={{ flexDirection: 'row', gap: 10 }}>
        <SheetInput
          label="Hours"
          value={h}
          onChangeText={setH}
          placeholder="7"
          keyboardType="number-pad"
          suffix="h"
          autoFocus
        />
        <SheetInput
          label="Minutes"
          value={m}
          onChangeText={setM}
          placeholder="20"
          keyboardType="number-pad"
          suffix="m"
        />
      </View>
      <BigButton
        label="LOG SLEEP"
        pad={14}
        disabled={!ok}
        onPress={() => {
          if (!ok) return;
          onClose();
          logActivity({
            tracker: 'sleep',
            source: 'manual',
            data: { kind: 'sleep', hours: hn, minutes: mn },
            title: `Slept ${hn}h ${mn}m`,
          });
        }}
      />
    </>
  );
}
