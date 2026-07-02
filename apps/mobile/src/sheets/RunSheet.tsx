import { router } from 'expo-router';
import { View } from 'react-native';
import { logActivity } from '../core';
import { colors } from '../theme';
import { Pressable98 } from '../components/Pressable98';
import { Txt } from '../components/Txt';
import { SheetRow } from './SheetRow';

const OPTIONS = [
  { label: 'Quick 2K', meta: '2.0 km', km: 2.0 },
  { label: 'Easy 5K', meta: '5.0 km', km: 5.0 },
  { label: 'Same as last time', meta: '4.2 km', km: 4.2 },
];

// Proto:670-684. GPS run is the primary action; quick logs are manual.
export function RunSheet({ onClose }: { onClose: () => void }) {
  return (
    <>
      <View style={{ gap: 8 }}>
        <Pressable98
          onPress={() => {
            onClose();
            router.push('/run');
          }}
          style={{
            backgroundColor: colors.accent,
            borderRadius: 16,
            paddingVertical: 15,
            paddingHorizontal: 16,
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <Txt size={15} w={900} color={colors.ink}>
            Start GPS run
          </Txt>
          <Txt size={12} w={800} color={colors.ink} style={{ opacity: 0.7 }}>
            live tracking
          </Txt>
        </Pressable98>
        {OPTIONS.map((o) => (
          <SheetRow
            key={o.label}
            label={o.label}
            meta={o.meta}
            onPress={() => {
              onClose();
              logActivity({
                tracker: 'running',
                source: 'manual',
                data: { kind: 'run', km: o.km },
                title: `Run logged · ${o.km.toFixed(1)} km`,
              });
            }}
          />
        ))}
      </View>
      <Txt size={11} w={600} color={colors.mutedDark} center>
        Quick logs are manual — GPS tracks live, even with the screen off
      </Txt>
    </>
  );
}
