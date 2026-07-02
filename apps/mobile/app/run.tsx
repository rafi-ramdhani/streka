import { useKeepAwake } from 'expo-keep-awake';
import * as Location from 'expo-location';
import { useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { Pressable, View } from 'react-native';
import Svg, { Path, Rect } from 'react-native-svg';
import { kmToMi } from '@streka/core';
import { useSettings } from '../src/core';
import { colors } from '../src/theme';
import { BigButton, LinkButton } from '../src/components/BigButton';
import { Check } from '../src/components/Check';
import { Pressable98 } from '../src/components/Pressable98';
import { RouteMap } from '../src/components/RouteMap';
import { SlashMark } from '../src/components/SlashMark';
import { Txt } from '../src/components/Txt';
import { formatDateLine } from '../src/lib/dates';
import { useLocationRun } from '../src/run/useLocationRun';
import { useGpsRun } from '../src/stores/gpsRun';
import { goBack } from '../src/lib/nav';

const PRIMER_BULLETS: { plain: string; bold: string; tail: string }[] = [
  {
    plain: 'Your route is recorded ',
    bold: 'on this phone',
    tail: ' — it only syncs to your account, never anywhere else.',
  },
  {
    plain: 'iOS will ask for ',
    bold: '"Always Allow"',
    tail: ' — that keeps tracking alive when your screen is off mid-run.',
  },
  {
    plain: 'GPS runs only while a run is live. ',
    bold: 'No tracking between runs.',
    tail: '',
  },
];

function Primer() {
  const run = useGpsRun();
  return (
    <View style={{ flex: 1, backgroundColor: colors.appBg }}>
      <View style={{ flex: 1, paddingTop: 64, paddingHorizontal: 24, gap: 18 }}>
        <View
          style={{
            width: 64,
            height: 64,
            borderRadius: 20,
            backgroundColor: 'rgba(23,194,95,.15)',
            alignItems: 'center',
            justifyContent: 'center',
            marginTop: 20,
          }}
        >
          <View
            style={{
              width: 26,
              height: 26,
              borderRadius: 13,
              borderWidth: 4,
              borderColor: colors.accentOnDark,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <View
              style={{
                width: 8,
                height: 8,
                borderRadius: 4,
                backgroundColor: colors.accentOnDark,
              }}
            />
          </View>
        </View>
        <Txt size={28} w={900} ls={-0.02} lineHeight={1.12}>
          Where you run{'\n'}stays yours
        </Txt>
        <View style={{ gap: 14 }}>
          {PRIMER_BULLETS.map((b) => (
            <View key={b.bold} style={{ flexDirection: 'row', gap: 12, alignItems: 'flex-start' }}>
              <View style={{ marginTop: 4 }}>
                <Check />
              </View>
              <Txt size={13.5} w={600} lineHeight={1.5} color="#c7cec6" style={{ flex: 1 }}>
                {b.plain}
                <Txt size={13.5} w={700} lineHeight={1.5} color={colors.white}>
                  {b.bold}
                </Txt>
                {b.tail}
              </Txt>
            </View>
          ))}
        </View>
      </View>
      <View style={{ paddingTop: 12, paddingHorizontal: 24, paddingBottom: 44, gap: 10 }}>
        <BigButton
          label="ENABLE LOCATION"
          onPress={async () => {
            const { status } = await Location.requestForegroundPermissionsAsync();
            if (status === 'granted') {
              run.prime();
              run.begin();
            }
          }}
        />
        <LinkButton
          label="Not now — I'll track runs with my watch"
          pad={8}
          onPress={() => {
            run.close();
            goBack();
          }}
        />
      </View>
    </View>
  );
}

function StatCard({ value, label }: { value: string; label: string }) {
  return (
    <View
      style={{
        flex: 1,
        backgroundColor: colors.tile,
        borderRadius: 16,
        paddingVertical: 14,
        paddingHorizontal: 8,
        alignItems: 'center',
      }}
    >
      <Txt size={22} w={900} tabular>
        {value}
      </Txt>
      <Txt size={10.5} w={700} color={colors.mutedDark}>
        {label}
      </Txt>
    </View>
  );
}

function Live() {
  const run = useGpsRun();
  const units = useSettings((s) => s.units);
  const [, setTick] = useState(0);
  useLocationRun(run.mode === 'live');
  // Foreground-only tracking until the background-location module lands
  // (TAD 5.2): keep the screen awake so a live run is not lost to sleep.
  useKeepAwake();

  useEffect(() => {
    const t = setInterval(() => setTick((n) => n + 1), 1000);
    return () => clearInterval(t);
  }, []);

  const imperial = units === 'imperial';
  const dist = imperial ? kmToMi(run.distanceKm) : run.distanceKm;
  const el = run.elapsedSec();
  const paceSec = dist > 0.05 ? el / dist : 0;
  const pace =
    run.paused || paceSec <= 0
      ? '—'
      : `${Math.floor(paceSec / 60)}:${String(Math.floor(paceSec % 60)).padStart(2, '0')}`;
  const time = `${Math.floor(el / 60)}:${String(Math.floor(el % 60)).padStart(2, '0')}`;
  const statsOpacity = run.paused ? 0.5 : 1;

  return (
    <View style={{ flex: 1, backgroundColor: colors.appBg }}>
      <View style={{ flex: 1, paddingTop: 64, paddingHorizontal: 24, gap: 18 }}>
        <View
          style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <View
              style={{ width: 7, height: 7, borderRadius: 4, backgroundColor: colors.accent }}
            />
            <Txt size={11} w={700} color={colors.accentOnDark}>
              GPS · strong
            </Txt>
          </View>
          {run.paused ? (
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: 6,
                backgroundColor: colors.amberBg,
                borderRadius: 999,
                paddingVertical: 5,
                paddingHorizontal: 12,
              }}
            >
              <Txt size={11} w={800} color={colors.amber}>
                {run.autoPaused ? 'AUTO-PAUSED — you stopped moving' : 'PAUSED'}
              </Txt>
            </View>
          ) : (
            <Txt size={11} w={700} color={colors.mutedDark}>
              auto-pause on
            </Txt>
          )}
        </View>

        <View style={{ alignItems: 'center', paddingTop: 12, opacity: statsOpacity }}>
          <Txt size={12} w={700} ls={0.1} upper color={colors.mutedDark}>
            distance
          </Txt>
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'baseline',
              justifyContent: 'center',
              gap: 8,
            }}
          >
            <Txt size={88} w={900} ls={-0.04} lineHeight={1} tabular>
              {dist.toFixed(2)}
            </Txt>
            <Txt size={20} w={800} color={colors.mutedDark}>
              {imperial ? 'mi' : 'km'}
            </Txt>
          </View>
        </View>

        <View style={{ flexDirection: 'row', gap: 10, opacity: statsOpacity }}>
          <StatCard value={time} label="time" />
          <StatCard value={pace} label={imperial ? 'pace / mi' : 'pace / km'} />
          {/* No watch integration in v1: an honest dash, never a fake pulse. */}
          <StatCard value="—" label="bpm · watch" />
        </View>

        <View style={{ flex: 1, opacity: statsOpacity }}>
          <RouteMap
            points={run.points}
            follow
            minHeight={100}
            fallbackLabel="live route · follows you"
          />
        </View>
      </View>

      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 22,
          paddingTop: 14,
          paddingHorizontal: 24,
          paddingBottom: 44,
        }}
      >
        <Pressable98
          onPress={run.togglePause}
          scaleTo={0.94}
          style={{
            width: 84,
            height: 84,
            borderRadius: 42,
            backgroundColor: colors.accent,
            alignItems: 'center',
            justifyContent: 'center',
            shadowColor: colors.accent,
            shadowOpacity: 0.4,
            shadowRadius: 30,
            shadowOffset: { width: 0, height: 10 },
          }}
        >
          {run.paused ? (
            <Svg width={26} height={28} viewBox="0 0 14 16">
              <Path d="M2 1l11 7-11 7V1z" fill={colors.ink} />
            </Svg>
          ) : (
            <Svg width={24} height={26} viewBox="0 0 16 18">
              <Rect x={1} y={2} width={5} height={14} rx={2} fill={colors.ink} />
              <Rect x={10} y={2} width={5} height={14} rx={2} fill={colors.ink} />
            </Svg>
          )}
        </Pressable98>
        <Pressable
          onLongPress={run.end}
          delayLongPress={800}
          style={({ pressed }) => ({
            width: 58,
            height: 58,
            borderRadius: 29,
            backgroundColor: 'rgba(224,101,79,.15)',
            alignItems: 'center',
            justifyContent: 'center',
            transform: [{ scale: pressed ? 0.9 : 1 }],
          })}
        >
          <Txt size={10} w={800} color={colors.danger} center lineHeight={1.2}>
            HOLD{'\n'}TO END
          </Txt>
        </Pressable>
      </View>
    </View>
  );
}

function Summary() {
  const run = useGpsRun();
  const units = useSettings((s) => s.units);
  const imperial = units === 'imperial';
  const dist = imperial ? kmToMi(run.sumKm) : run.sumKm;
  const paceSec = dist > 0 ? run.sumSec / dist : 0;
  const pace =
    paceSec > 0
      ? `${Math.floor(paceSec / 60)}:${String(Math.floor(paceSec % 60)).padStart(2, '0')}`
      : '—';
  return (
    <View style={{ flex: 1, backgroundColor: colors.appBg }}>
      <View style={{ flex: 1, paddingTop: 64, paddingHorizontal: 24, gap: 16 }}>
        <Txt size={16} w={900}>
          Run complete
        </Txt>
        <View>
          <Txt size={12} w={600} ls={0.08} upper color={colors.mutedDark}>
            {formatDateLine(new Date())} · GPS
          </Txt>
          <View
            style={{ flexDirection: 'row', alignItems: 'baseline', gap: 10, marginTop: 4 }}
          >
            <Txt size={64} w={900} ls={-0.03} lineHeight={1}>
              {dist.toFixed(2)}
            </Txt>
            <Txt size={18} w={800} color={colors.mutedDark}>
              {imperial ? 'mi' : 'km'}
            </Txt>
          </View>
        </View>
        <View style={{ flexDirection: 'row', gap: 10 }}>
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
              {run.sumTime}
            </Txt>
            <Txt size={10.5} w={700} color={colors.mutedDark}>
              time
            </Txt>
          </View>
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
              {pace}
            </Txt>
            <Txt size={10.5} w={700} color={colors.mutedDark}>
              {imperial ? 'min / mi' : 'min / km'}
            </Txt>
          </View>
        </View>
        <RouteMap points={run.points} minHeight={140} fallbackLabel="your route" />
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
            This run counts for today
          </Txt>
        </View>
      </View>
      <View style={{ paddingTop: 12, paddingHorizontal: 24, paddingBottom: 44 }}>
        <BigButton
          label="SAVE RUN"
          onPress={() => {
            run.save();
            goBack();
          }}
        />
      </View>
    </View>
  );
}

export default function Run() {
  const mode = useGpsRun((s) => s.mode);
  const open = useGpsRun((s) => s.open);
  const devMode = useLocalSearchParams<{ dev?: string }>().dev;

  // Entering the route starts the flow: primer on first use, live otherwise.
  // The dev param jumps to a specific state for screenshot verification.
  useFocusEffect(
    useCallback(() => {
      const run = useGpsRun.getState();
      if (__DEV__ && devMode) {
        run.prime();
        run.begin();
        // A small synthetic route so the map renders in dev verification.
        for (let i = 0; i < 24; i += 1) {
          run.addPoint(37.7749 + i * 0.0004, -122.4194 + Math.sin(i / 4) * 0.0006);
        }
        if (devMode === 'live') run.addDistance(1.24);
        if (devMode === 'paused') {
          run.addDistance(2.84);
          run.setAutoPaused(true);
        }
        if (devMode === 'summary') {
          run.addDistance(4.21);
          run.end();
        }
        return;
      }
      if (run.mode === null) open();
    }, [open, devMode]),
  );

  if (mode === 'primer') return <Primer />;
  if (mode === 'summary') return <Summary />;
  return <Live />;
}
