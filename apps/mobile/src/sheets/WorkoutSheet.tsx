import { router } from 'expo-router';
import { View } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { logActivity } from '../core';
import { useSession } from '../stores/session';
import { colors } from '../theme';
import { Pressable98 } from '../components/Pressable98';
import { Txt } from '../components/Txt';

// Proto:638-652. Template metas switch between the starter-plan copy (fresh
// board) and the recent-history copy (demo data).
const TEMPLATES = (fresh: boolean) => [
  {
    name: 'Upper body',
    meta: fresh ? '6 exercises · ~45 min · starter plan' : '6 exercises · ~45 min · done Tue',
    primary: true,
  },
  {
    name: 'Lower body',
    meta: fresh ? '5 exercises · ~40 min · starter plan' : '5 exercises · ~40 min · done Sun',
    primary: false,
  },
  {
    name: 'Full body 30',
    meta: fresh ? '8 exercises · ~30 min · starter plan' : '8 exercises · ~30 min · done Jun 24',
    primary: false,
  },
];

export function WorkoutSheet({ fresh, onClose }: { fresh: boolean; onClose: () => void }) {
  const start = useSession((s) => s.start);
  const begin = (name: string) => {
    onClose();
    start(name);
    router.push('/session');
  };

  return (
    <>
      <View style={{ gap: 8 }}>
        <Txt size={11} w={700} ls={0.06} upper color={colors.mutedDark}>
          Recent
        </Txt>
        {TEMPLATES(fresh).map((t) => (
          <Pressable98
            key={t.name}
            onPress={() => begin(t.name)}
            style={{
              backgroundColor: colors.appBg,
              borderWidth: 1,
              borderColor: 'rgba(255,255,255,.08)',
              borderRadius: 16,
              paddingVertical: 14,
              paddingHorizontal: 16,
              flexDirection: 'row',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}
          >
            <View>
              <Txt size={15} w={800}>
                {t.name}
              </Txt>
              <Txt size={11.5} w={600} color={colors.mutedDark} style={{ marginTop: 1 }}>
                {t.meta}
              </Txt>
            </View>
            <View
              style={{
                width: 34,
                height: 34,
                borderRadius: 17,
                backgroundColor: t.primary ? colors.accent : 'rgba(255,255,255,.1)',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Svg width={12} height={14} viewBox="0 0 12 14">
                <Path d="M2 1l9 6-9 6V1z" fill={t.primary ? colors.ink : colors.white} />
              </Svg>
            </View>
          </Pressable98>
        ))}
      </View>
      <View style={{ flexDirection: 'row', gap: 10 }}>
        <Pressable98
          onPress={() => begin('Workout')}
          style={{
            flex: 1,
            borderWidth: 1.5,
            borderStyle: 'dashed',
            borderColor: 'rgba(255,255,255,.25)',
            borderRadius: 16,
            padding: 13,
            alignItems: 'center',
          }}
        >
          <Txt size={13} w={800}>
            Start empty
          </Txt>
        </Pressable98>
        <Pressable98
          onPress={() => {
            onClose();
            logActivity({
              tracker: 'workouts',
              source: 'manual',
              data: { kind: 'workout', name: 'Logged manually', mins: 0 },
              title: 'Workout logged',
            });
          }}
          style={{
            flex: 1,
            borderWidth: 1.5,
            borderStyle: 'dashed',
            borderColor: 'rgba(255,255,255,.25)',
            borderRadius: 16,
            padding: 13,
            alignItems: 'center',
          }}
        >
          <Txt size={13} w={800}>
            Log past workout
          </Txt>
        </Pressable98>
      </View>
    </>
  );
}
