import { useState } from 'react';
import { View } from 'react-native';
import { logActivity } from '../core';
import { BigButton } from '../components/BigButton';
import { Txt } from '../components/Txt';
import { colors } from '../theme';
import { SheetRow } from './SheetRow';
import { SheetInput } from './SheetInput';

const OPTIONS = [
  { label: 'Short swim', meta: '400 m', m: 400 },
  { label: 'Regular swim', meta: '800 m', m: 800 },
  { label: 'Long swim', meta: '1,200 m', m: 1200 },
];

// Proto:686-695, with a custom distance for anything off the presets.
export function SwimSheet({ onClose }: { onClose: () => void }) {
  const [dist, setDist] = useState('');
  const m = Math.round(parseFloat(dist));
  const ok = Number.isFinite(m) && m > 0;

  const log = (meters: number) => {
    onClose();
    logActivity({
      tracker: 'swimming',
      source: 'manual',
      data: { kind: 'swim', m: meters },
      title: `Swim logged · ${meters.toLocaleString('en-US')} m`,
    });
  };

  return (
    <>
      <View style={{ gap: 8 }}>
        {OPTIONS.map((o) => (
          <SheetRow key={o.m} label={o.label} meta={o.meta} onPress={() => log(o.m)} />
        ))}
      </View>

      <View style={{ gap: 10 }}>
        <Txt size={11} w={700} ls={0.06} upper color={colors.mutedDark}>
          Custom distance
        </Txt>
        <SheetInput
          label="Distance"
          value={dist}
          onChangeText={setDist}
          placeholder="1000"
          keyboardType="number-pad"
          suffix="m"
        />
        <BigButton label="LOG SWIM" pad={14} onPress={() => ok && log(m)} disabled={!ok} />
      </View>
    </>
  );
}
