import { router } from 'expo-router';
import { Alert, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { dayOf, lastWorkoutDay } from '@streka/core';
import { logActivity, useLogs } from '../core';
import { TEMPLATES, useSession } from '../stores/session';
import { useCustomWorkouts } from '../stores/customWorkouts';
import { colors } from '../theme';
import { Pressable98 } from '../components/Pressable98';
import { Txt } from '../components/Txt';

// Proto:638-652. Exercise counts come from the real templates; the trailing
// meta is the last time this template was actually logged, or the
// starter-plan copy when it never was. Below the templates sit the user's own
// saved workouts and a builder for new ones.
const SHEET_TEMPLATES = [
  { name: 'Upper body', mins: 45, primary: true },
  { name: 'Lower body', mins: 40, primary: false },
  { name: 'Full body 30', mins: 30, primary: false },
];

function doneLabel(day: string | null): string {
  if (!day) return 'starter plan';
  const d = new Date(`${day}T12:00:00`);
  const ageDays = Math.round((Date.parse(`${dayOf(Date.now())}T12:00:00`) - d.getTime()) / 86_400_000);
  const label =
    ageDays <= 6
      ? d.toLocaleDateString('en-US', { weekday: 'short' })
      : d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  return `done ${label}`;
}

function PlayBadge({ primary }: { primary: boolean }) {
  return (
    <View
      style={{
        width: 34,
        height: 34,
        borderRadius: 17,
        backgroundColor: primary ? colors.accent : 'rgba(255,255,255,.1)',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <Svg width={12} height={14} viewBox="0 0 12 14">
        <Path d="M2 1l9 6-9 6V1z" fill={primary ? colors.ink : colors.white} />
      </Svg>
    </View>
  );
}

function WorkoutRow({
  name,
  meta,
  primary,
  onPress,
  onLongPress,
}: {
  name: string;
  meta: string;
  primary: boolean;
  onPress: () => void;
  onLongPress?: () => void;
}) {
  return (
    <Pressable98
      onPress={onPress}
      onLongPress={onLongPress}
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
      <View style={{ flex: 1, paddingRight: 12 }}>
        <Txt size={15} w={800}>
          {name}
        </Txt>
        <Txt size={11.5} w={600} color={colors.mutedDark} style={{ marginTop: 1 }}>
          {meta}
        </Txt>
      </View>
      <PlayBadge primary={primary} />
    </Pressable98>
  );
}

export function WorkoutSheet({ onClose }: { onClose: () => void }) {
  const entries = useLogs((s) => s.entries);
  const start = useSession((s) => s.start);
  const custom = useCustomWorkouts((s) => s.workouts);
  const removeCustom = useCustomWorkouts((s) => s.remove);
  const begin = (name: string) => {
    onClose();
    start(name);
    router.push('/session');
  };

  const confirmDelete = (id: string, name: string) =>
    Alert.alert('Delete workout?', `"${name}" will be removed from your list.`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => removeCustom(id) },
    ]);

  return (
    <>
      <View style={{ gap: 8 }}>
        <Txt size={11} w={700} ls={0.06} upper color={colors.mutedDark}>
          Recent
        </Txt>
        {SHEET_TEMPLATES.map((t) => (
          <WorkoutRow
            key={t.name}
            name={t.name}
            primary={t.primary}
            meta={`${TEMPLATES[t.name]!.length} exercises · ~${t.mins} min · ${doneLabel(
              lastWorkoutDay(entries, t.name),
            )}`}
            onPress={() => begin(t.name)}
          />
        ))}
      </View>

      {custom.length > 0 ? (
        <View style={{ gap: 8 }}>
          <Txt size={11} w={700} ls={0.06} upper color={colors.mutedDark}>
            Your workouts
          </Txt>
          {custom.map((w) => (
            <WorkoutRow
              key={w.id}
              name={w.name}
              primary={false}
              meta={`${w.exercises.length} exercises · ${doneLabel(lastWorkoutDay(entries, w.name))}`}
              onPress={() => begin(w.name)}
              onLongPress={() => confirmDelete(w.id, w.name)}
            />
          ))}
          <Txt size={10.5} w={600} color={colors.mutedDark}>
            Hold a workout to delete it.
          </Txt>
        </View>
      ) : null}

      <Pressable98
        onPress={() => {
          onClose();
          router.push('/workout-builder');
        }}
        style={{
          borderWidth: 1.5,
          borderStyle: 'dashed',
          borderColor: 'rgba(255,255,255,.25)',
          borderRadius: 16,
          padding: 14,
          alignItems: 'center',
        }}
      >
        <Txt size={13} w={800} color={colors.accentOnDark}>
          + Build a workout
        </Txt>
      </Pressable98>

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
