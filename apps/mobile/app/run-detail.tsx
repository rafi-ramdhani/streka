import { useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { formatDistance, intentionalDays, kmToMi, streak } from '@streka/core';
import { useLogs, useSettings } from '../src/core';
import { Pressable98 } from '../src/components/Pressable98';
import { RouteMap } from '../src/components/RouteMap';
import { SlashMark } from '../src/components/SlashMark';
import { Txt } from '../src/components/Txt';
import { EditEntrySheet } from '../src/sheets/EditEntrySheet';
import { colors } from '../src/theme';
import { goBack } from '../src/lib/nav';
import { useScreenPad } from '../src/lib/screenPad';

// Run detail (canvas 10a): opens from the Run tile via long-press. The canvas
// shows the watch-import variant; the source chip adapts to how the run was
// logged. Runs with a recorded route render the real map; quick logs keep
// the designed placeholder.

function fmtClock(ts: number): string {
  const d = new Date(ts);
  return `${d.getHours()}:${String(d.getMinutes()).padStart(2, '0')}`;
}

function parseMmSs(t: string): number | null {
  const m = /^(\d+):(\d\d)$/.exec(t);
  return m ? Number(m[1]) * 60 + Number(m[2]) : null;
}

export default function RunDetail() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const entries = useLogs((s) => s.entries);
  const units = useSettings((s) => s.units);
  const tombstone = useLogs((s) => s.tombstone);
  const pad = useScreenPad();
  const [editing, setEditing] = useState(false);

  const entry = entries.find((e) => e.id === id && !e.deleted);
  if (!entry || entry.data.kind !== 'run') {
    return <View style={{ flex: 1, backgroundColor: colors.appBg }} />;
  }
  const run = entry.data;

  const hour = new Date(entry.ts).getHours();
  const title = hour < 12 ? 'Morning run' : hour < 18 ? 'Afternoon run' : 'Evening run';
  const source =
    entry.source === 'gps'
      ? 'GPS · this phone'
      : entry.source === 'health'
        ? 'Apple Watch'
        : 'Logged manually';

  const durationSec = run.time ? parseMmSs(run.time) : null;
  const dateLine = new Date(entry.ts)
    .toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
    .concat(
      durationSec
        ? ` · ${fmtClock(entry.ts - durationSec * 1000)} – ${fmtClock(entry.ts)}`
        : '',
    );

  const streakDay = streak(intentionalDays(entries), entry.day);
  const kcal = Math.round(run.km * 74); // matches the canvas ratio (312 kcal / 4.21 km)
  const distance = units === 'imperial' ? kmToMi(run.km).toFixed(2) : run.km.toFixed(2);
  const distUnit = units === 'imperial' ? 'mi' : 'km';

  const card = (value: string, label: string) => (
    <View
      style={{
        flex: 1,
        backgroundColor: colors.tile,
        borderRadius: 16,
        paddingVertical: 13,
        paddingHorizontal: 14,
      }}
    >
      <Txt size={19} w={900} tabular>
        {value}
      </Txt>
      <Txt size={10.5} w={700} color={colors.mutedDark}>
        {label}
      </Txt>
    </View>
  );

  return (
    <View style={{ flex: 1, backgroundColor: colors.appBg }}>
      <View style={{ flex: 1, paddingTop: pad.top, paddingHorizontal: 20, gap: 16 }}>
        <View
          style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
            <Pressable98 onPress={() => goBack()} hitSlop={12} scaleTo={0.9}>
              <Svg width={9} height={16} viewBox="0 0 9 16">
                <Path
                  d="M8 1L1 8l7 7"
                  stroke={colors.mutedDark}
                  strokeWidth={2.5}
                  fill="none"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </Svg>
            </Pressable98>
            <Txt size={16} w={900}>
              {title}
            </Txt>
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <View
              style={{
                width: 14,
                height: 14,
                borderRadius: 4,
                backgroundColor: 'rgba(255,255,255,.1)',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <View
                style={{
                  width: 6,
                  height: 6,
                  borderRadius: 3,
                  borderWidth: 1.5,
                  borderColor: colors.accentOnDark,
                }}
              />
            </View>
            <Txt size={11} w={700} color={colors.mutedDark}>
              {source}
            </Txt>
          </View>
        </View>

        <View>
          <Txt size={12} w={600} ls={0.08} upper color={colors.mutedDark}>
            {dateLine}
          </Txt>
          <View
            style={{ flexDirection: 'row', alignItems: 'baseline', gap: 10, marginTop: 4 }}
          >
            <Txt size={64} w={900} ls={-0.03} lineHeight={1}>
              {distance}
            </Txt>
            <Txt size={18} w={800} color={colors.mutedDark}>
              {distUnit}
            </Txt>
          </View>
        </View>

        <View style={{ flexDirection: 'row', gap: 10 }}>
          {card(run.time ?? '—', 'time')}
          {card(run.pace ?? '—', units === 'imperial' ? 'min / mi' : 'min / km')}
          {card(String(kcal), 'kcal')}
        </View>

        <RouteMap
          points={run.route ?? []}
          minHeight={180}
          fallbackLabel={entry.source === 'gps' ? 'route map · GPS from phone' : 'route map'}
        />

        <View
          style={{
            backgroundColor: 'rgba(23,194,95,.12)',
            borderRadius: 16,
            paddingVertical: 13,
            paddingHorizontal: 16,
            flexDirection: 'row',
            alignItems: 'center',
            gap: 11,
          }}
        >
          <SlashMark size={14} color={colors.accentOnDark} />
          <Txt size={12.5} w={700} color={colors.accentOnDark}>
            Counted for{' '}
            {new Date(entry.ts).toLocaleDateString('en-US', {
              weekday: 'short',
              month: 'short',
              day: 'numeric',
            })}{' '}
            — streak day {streakDay}
          </Txt>
        </View>
      </View>

      <View
        style={{
          flexDirection: 'row',
          gap: 10,
          paddingTop: 12,
          paddingHorizontal: 20,
          paddingBottom: pad.bottom,
        }}
      >
        <Pressable98
          onPress={() => setEditing(true)}
          style={{
            flex: 1,
            alignItems: 'center',
            padding: 13,
            borderRadius: 14,
            backgroundColor: 'rgba(255,255,255,.08)',
          }}
        >
          <Txt size={13} w={800} color={colors.mutedDark}>
            Edit
          </Txt>
        </Pressable98>
        <Pressable98
          onPress={() => {
            tombstone(entry.id);
            goBack();
          }}
          style={{
            flex: 1,
            alignItems: 'center',
            padding: 13,
            borderRadius: 14,
            backgroundColor: 'rgba(255,255,255,.08)',
          }}
        >
          <Txt size={13} w={800} color={colors.mutedDark}>
            Delete
          </Txt>
        </Pressable98>
      </View>
      {editing ? (
        <EditEntrySheet entry={entry} units={units} onClose={() => setEditing(false)} />
      ) : null}
    </View>
  );
}
