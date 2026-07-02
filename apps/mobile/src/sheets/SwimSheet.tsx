import { View } from 'react-native';
import { logActivity } from '../core';
import { SheetRow } from './SheetRow';

const OPTIONS = [
  { label: 'Short swim', meta: '400 m', m: 400 },
  { label: 'Regular swim', meta: '800 m', m: 800 },
  { label: 'Long swim', meta: '1,200 m', m: 1200 },
];

// Proto:686-695.
export function SwimSheet({ onClose }: { onClose: () => void }) {
  return (
    <View style={{ gap: 8 }}>
      {OPTIONS.map((o) => (
        <SheetRow
          key={o.m}
          label={o.label}
          meta={o.meta}
          onPress={() => {
            onClose();
            logActivity({
              tracker: 'swimming',
              source: 'manual',
              data: { kind: 'swim', m: o.m },
              title: `Swim logged · ${o.m.toLocaleString('en-US')} m`,
            });
          }}
        />
      ))}
    </View>
  );
}
