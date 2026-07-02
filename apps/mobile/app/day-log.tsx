import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { ScrollView, View } from 'react-native';
import {
  addDays,
  formatDistance,
  formatWeight,
  kgToLb,
  toastSub,
  type LogEntry,
  type TrackerId,
  type Units,
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
// each editable and deletable, so a mislogged day can be reverted. Each
// tracker keeps its tile's framing: meals against the kcal goal, weight
// with the week delta, runs with pace and route, workouts with their top
// sets. Undesigned screen, flagged in the TAD; actions follow canvas 10a.

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

function titleLine(e: LogEntry, units: Units): string {
  const d = e.data;
  switch (d.kind) {
    case 'workout':
      return d.mins > 0 ? `${d.name} · ${d.mins} min` : d.name;
    case 'meal':
      return d.label
        ? `${d.label} · ${d.kcal.toLocaleString('en-US')} kcal`
        : `${d.kcal.toLocaleString('en-US')} kcal`;
    case 'run':
      return [
        formatDistance(d.km, units),
        ...(d.time ? [d.time] : []),
        ...(d.pace ? [`${d.pace} pace`] : []),
      ].join(' · ');
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

// The per-exercise recap under a session row: what the bests card feeds on.
function workoutDetail(e: LogEntry): string[] {
  if (e.data.kind !== 'workout' || !e.data.exercises) return [];
  return e.data.exercises.map((x) => (x.topSet ? `${x.name} · ${x.topSet}` : x.name));
}

function Bar({ pct }: { pct: number }) {
  return (
    <View
      style={{
        marginTop: 10,
        height: 7,
        borderRadius: 4,
        backgroundColor: 'rgba(255,255,255,.12)',
      }}
    >
      <View
        style={{
          width: `${Math.min(100, pct)}%`,
          height: '100%',
          borderRadius: 4,
          backgroundColor: colors.accent,
        }}
      />
    </View>
  );
}

// Tracker-specific framing above the rows, mirroring what its tile shows.
function Summary({
  t,
  todays,
  entries,
  units,
  kcalGoal,
  today,
}: {
  t: TrackerId;
  todays: LogEntry[];
  entries: LogEntry[];
  units: Units;
  kcalGoal: number;
  today: string;
}) {
  if (todays.length === 0) return null;

  const card = (main: string, sub: string, extra?: React.ReactNode) => (
    <View style={{ backgroundColor: colors.tile, borderRadius: 16, padding: 15 }}>
      <Txt size={26} w={900} ls={-0.02}>
        {main}
      </Txt>
      <Txt size={11.5} w={600} color={colors.mutedDark} style={{ marginTop: 2 }}>
        {sub}
      </Txt>
      {extra}
    </View>
  );

  switch (t) {
    case 'meals': {
      const total = todays.reduce((s, e) => s + (e.data.kind === 'meal' ? e.data.kcal : 0), 0);
      const pct = Math.round((total / kcalGoal) * 100);
      return card(
        `${total.toLocaleString('en-US')} kcal`,
        `${pct}% of ${kcalGoal.toLocaleString('en-US')} kcal today`,
        <Bar pct={pct} />,
      );
    }
    case 'running': {
      if (todays.length < 2) return null;
      const km = todays.reduce((s, e) => s + (e.data.kind === 'run' ? e.data.km : 0), 0);
      return card(formatDistance(Math.round(km * 100) / 100, units), `across ${todays.length} runs`);
    }
    case 'swimming': {
      if (todays.length < 2) return null;
      const m = todays.reduce((s, e) => s + (e.data.kind === 'swim' ? e.data.m : 0), 0);
      return card(`${m.toLocaleString('en-US')} m`, `across ${todays.length} swims`);
    }
    case 'weight': {
      const latest = todays[todays.length - 1]!;
      if (latest.data.kind !== 'weight') return null;
      // Same framing as the tile: against the most recent entry from at
      // least a week ago.
      const cutoff = addDays(today, -7);
      let ref: number | undefined;
      let refTs = -Infinity;
      for (const e of entries) {
        if (e.deleted || e.data.kind !== 'weight' || e.day > cutoff || e.ts <= refTs) continue;
        refTs = e.ts;
        ref = e.data.kg;
      }
      const diff = ref !== undefined ? latest.data.kg - ref : undefined;
      const sub =
        diff === undefined
          ? 'baseline'
          : `${diff <= 0 ? '▾' : '▴'} ${(units === 'imperial'
              ? kgToLb(Math.abs(diff))
              : Math.abs(diff)
            ).toFixed(1)} this week`;
      return card(formatWeight(latest.data.kg, units), sub);
    }
    default:
      return null;
  }
}

export default function DayLog() {
  const { tracker, edit } = useLocalSearchParams<{ tracker?: string; edit?: string }>();
  const entries = useLogs((s) => s.entries);
  const tombstone = useLogs((s) => s.tombstone);
  const units = useSettings((s) => s.units);
  const kcalGoal = useSettings((s) => s.kcalGoal);
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
        <Summary
          t={t}
          todays={todays}
          entries={entries}
          units={units}
          kcalGoal={kcalGoal}
          today={today}
        />
        {todays.length === 0 ? (
          <Txt size={13} w={600} color={colors.mutedDark} style={{ marginTop: 6 }}>
            Nothing logged today.
          </Txt>
        ) : (
          todays.map((e) => {
            const detail = workoutDetail(e);
            return (
              <View
                key={e.id}
                style={{ backgroundColor: colors.tile, borderRadius: 16, padding: 15, gap: 10 }}
              >
                <View>
                  <Txt size={16} w={900}>
                    {titleLine(e, units)}
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
                {detail.length > 0 ? (
                  <View
                    style={{
                      borderRadius: 12,
                      backgroundColor: 'rgba(255,255,255,.05)',
                      paddingVertical: 10,
                      paddingHorizontal: 12,
                      gap: 4,
                    }}
                  >
                    {detail.map((line) => (
                      <Txt key={line} size={12.5} w={700} color="#c7cec6">
                        {line}
                      </Txt>
                    ))}
                  </View>
                ) : null}
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
            );
          })
        )}
      </ScrollView>
      {editing ? (
        <EditEntrySheet entry={editing} units={units} onClose={() => setEditing(null)} />
      ) : null}
    </View>
  );
}
