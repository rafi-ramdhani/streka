import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { ScrollView, View } from 'react-native';
import {
  formatDistance,
  formatWeight,
  toastSub,
  type LogEntry,
  type TrackerId,
} from '@streka/core';
import { showToast, useLogs, useSettings, useSync } from '../src/core';
import { Pressable98 } from '../src/components/Pressable98';
import { SubHeader } from '../src/components/SubHeader';
import { Txt } from '../src/components/Txt';
import { EditEntrySheet, editableKind } from '../src/sheets/EditEntrySheet';
import { useScreenPad } from '../src/lib/screenPad';
import { useToday } from '../src/lib/useToday';
import { colors } from '../src/theme';

// Long-press target for every Board tile: today's entries for one tracker,
// each editable and deletable, so a mislogged day can be reverted. The
// layout follows the run detail's header and action language (canvas 10a);
// the screen itself is undesigned and flagged in the TAD.

const TITLES: Record<TrackerId, string> = {
  steps: 'Steps today',
  workouts: 'Workouts today',
  meals: 'Meals today',
  running: 'Runs today',
  weight: 'Weight today',
  swimming: 'Swims today',
  classes: 'Classes today',
  sleep: 'Sleep today',
};

const SOURCE_LABEL = {
  manual: 'logged by hand',
  session: 'live session',
  gps: 'GPS',
  scan: 'scanned',
  health: 'auto',
} as const;

function valueLine(e: LogEntry, units: 'metric' | 'imperial'): string {
  const d = e.data;
  switch (d.kind) {
    case 'workout':
      return d.mins > 0 ? `${d.name} · ${d.mins} min` : d.name;
    case 'meal':
      return `${d.kcal.toLocaleString('en-US')} kcal${d.label ? ` · ${d.label}` : ''}`;
    case 'run':
      return `${formatDistance(d.km, units)}${d.time ? ` · ${d.time}` : ''}`;
    case 'swim':
      return `${d.m.toLocaleString('en-US')} m`;
    case 'weight':
      return formatWeight(d.kg, units);
    case 'class':
      return d.name ?? 'Class';
    case 'steps':
      return `${d.count.toLocaleString('en-US')} steps`;
    case 'sleep':
      return `${d.hours}h ${d.minutes}m`;
  }
}

export default function DayLog() {
  const { tracker, edit } = useLocalSearchParams<{ tracker?: string; edit?: string }>();
  const entries = useLogs((s) => s.entries);
  const tombstone = useLogs((s) => s.tombstone);
  const units = useSettings((s) => s.units);
  const account = useSettings((s) => s.hasAccount);
  const online = useSync((s) => s.online);
  const pad = useScreenPad();
  const today = useToday();
  const [editing, setEditing] = useState<LogEntry | null>(null);

  const t = (tracker ?? '') as TrackerId;
  const todays = useMemo(
    () =>
      entries
        .filter((e) => !e.deleted && e.day === today && e.tracker === t)
        .sort((a, b) => a.ts - b.ts),
    [entries, today, t],
  );

  // Dev-only: ?edit=1 opens the first entry's editor for screenshot walks.
  useEffect(() => {
    if (__DEV__ && edit === '1' && todays[0]) setEditing(todays[0]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [edit]);

  const action = (label: string, color: string, onPress: () => void) => (
    <Pressable98
      onPress={onPress}
      hitSlop={8}
      style={{
        paddingVertical: 7,
        paddingHorizontal: 12,
        borderRadius: 10,
        backgroundColor: 'rgba(255,255,255,.08)',
      }}
    >
      <Txt size={12} w={800} color={color}>
        {label}
      </Txt>
    </Pressable98>
  );

  return (
    <View style={{ flex: 1, backgroundColor: colors.appBg, paddingTop: pad.top }}>
      <ScrollView contentContainerStyle={{ paddingHorizontal: 20, gap: 12, paddingBottom: 30 }}>
        <SubHeader title={TITLES[t] ?? 'Today'} />
        {todays.length === 0 ? (
          <Txt size={13} w={600} color={colors.mutedDark} style={{ marginTop: 6 }}>
            Nothing logged today.
          </Txt>
        ) : (
          todays.map((e) => (
            <View
              key={e.id}
              style={{ backgroundColor: colors.tile, borderRadius: 16, padding: 15, gap: 10 }}
            >
              <View>
                <Txt size={16} w={900}>
                  {valueLine(e, units)}
                </Txt>
                <Txt size={11.5} w={600} color={colors.mutedDark} style={{ marginTop: 2 }}>
                  {new Date(e.ts).toLocaleTimeString('en-GB', {
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                  {' · '}
                  {SOURCE_LABEL[e.source]}
                </Txt>
              </View>
              <View style={{ flexDirection: 'row', gap: 8 }}>
                {e.data.kind === 'run' && e.data.route ? (
                  action('Route', colors.white, () => router.push(`/run-detail?id=${e.id}`))
                ) : null}
                {editableKind(e.data.kind)
                  ? action('Edit', colors.accentOnDark, () => setEditing(e))
                  : null}
                {action('Delete', colors.danger, () => {
                  tombstone(e.id);
                  showToast(
                    'Entry deleted',
                    toastSub({ account, online, firstLog: false, streakN: 0 }),
                  );
                })}
              </View>
            </View>
          ))
        )}
      </ScrollView>
      {editing ? (
        <EditEntrySheet entry={editing} units={units} onClose={() => setEditing(null)} />
      ) : null}
    </View>
  );
}
