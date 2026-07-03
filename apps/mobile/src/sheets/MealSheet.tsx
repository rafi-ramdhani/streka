import { router } from 'expo-router';
import { View } from 'react-native';
import { logActivity, showToast, useSettings, useSync } from '../core';
import { colors } from '../theme';
import { Pressable98 } from '../components/Pressable98';
import { Txt } from '../components/Txt';
import { SheetRow } from './SheetRow';

const OPTIONS = [
  { label: 'Light meal / snack', kcal: 300 },
  { label: 'Regular meal', kcal: 550 },
  { label: 'Big meal', kcal: 800 },
];

// Proto:654-668. The photo scan needs an AI service that is not in this build
// (TAD 5.2), so it is honestly unavailable to real users; the mock stays
// reachable on the demo dataset for verification. Quick estimates always work.
export function MealSheet({ onClose }: { onClose: () => void }) {
  const hasAccount = useSettings((s) => s.hasAccount);
  const online = useSync((s) => s.online);
  // Only the demo dataset carries an account, and it is where the mock scan is
  // demonstrated; every real user logs meals by hand until the service lands.
  const scanEnabled = hasAccount && online;

  const onScanTap = () => {
    if (!hasAccount) {
      showToast(
        'Photo scan isn’t in this build',
        'Reading a plate from a photo needs a service that arrives later. The quick estimates below log now.',
      );
      return;
    }
    if (!online) {
      showToast('Scanning needs a connection', 'You’re offline. The quick estimates below still work.');
      return;
    }
    onClose();
    router.push('/scan');
  };

  return (
    <>
      <View style={{ gap: 8 }}>
        <Pressable98
          onPress={onScanTap}
          style={{
            backgroundColor: scanEnabled ? colors.accent : 'rgba(255,255,255,.06)',
            borderRadius: 16,
            paddingVertical: 15,
            paddingHorizontal: 16,
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <Txt size={15} w={900} color={scanEnabled ? colors.ink : colors.mutedDark}>
            Scan your food
          </Txt>
          <Txt
            size={11.5}
            w={800}
            color={scanEnabled ? colors.ink : colors.mutedDark}
            style={{ opacity: 0.75 }}
          >
            {scanEnabled ? 'AI · camera' : !hasAccount ? 'not in this build' : 'needs a connection'}
          </Txt>
        </Pressable98>
        {OPTIONS.map((o) => (
          <SheetRow
            key={o.kcal}
            label={o.label}
            meta={`${o.kcal} kcal`}
            onPress={() => {
              onClose();
              logActivity({
                tracker: 'meals',
                source: 'manual',
                data: { kind: 'meal', kcal: o.kcal, label: o.label },
                title: `Meal logged · ${o.kcal} kcal`,
              });
            }}
          />
        ))}
      </View>
      <Txt size={11} w={600} color={colors.mutedDark} center>
        Quick estimates — you can refine portions later
      </Txt>
    </>
  );
}
