import { useMemo, useState } from 'react';
import { ScrollView, View } from 'react-native';
import Svg, { Circle, Polyline } from 'react-native-svg';
import {
  addDays,
  bestLift,
  dayOf,
  formatDistance,
  formatWeight,
  intentionalDays,
  kgToLb,
  monthWeekCounts,
  weekDayCounts,
  weekStartOf,
  weeklyActiveDays,
  type LogEntry,
} from '@streka/core';
import { healthFor, useLogs, useSettings } from '../../src/core';
import { Pressable98 } from '../../src/components/Pressable98';
import { Txt } from '../../src/components/Txt';
import { colors } from '../../src/theme';

const DAY_LABELS = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];

function Card({ children }: { children: React.ReactNode }) {
  return (
    <View style={{ backgroundColor: colors.tile, borderRadius: 22, padding: 18 }}>{children}</View>
  );
}

// Bar height mapping: real log counts, no fake data. Zero-log past days show
// a low solid stub; future days a dashed outline (canvas 10c).
function barHeight(count: number): number {
  if (count === 0) return 10;
  return Math.min(58, 21 + count * 13);
}

export default function Trends() {
  const entries = useLogs((s) => s.entries);
  const units = useSettings((s) => s.units);
  const imperial = units === 'imperial';
  const [period, setPeriod] = useState<'week' | 'month'>('week');
  const today = dayOf(Date.now());
  const weekStart = weekStartOf(today);
  const isWeek = period === 'week';

  const days = useMemo(() => intentionalDays(entries), [entries]);
  const firstLogDay = useMemo(() => {
    let min: string | undefined;
    for (const d of days) if (!min || d < min) min = d;
    return min;
  }, [days]);
  const daysIn = firstLogDay
    ? Math.max(
        1,
        Math.round((Date.parse(today) - Date.parse(firstLogDay)) / 86_400_000) + 1,
      )
    : 1;
  const firstWeek = !firstLogDay || firstLogDay >= weekStart;

  const weekCounts = useMemo(() => weekDayCounts(entries, weekStart), [entries, weekStart]);
  const monthCounts = useMemo(() => monthWeekCounts(entries, today), [entries, today]);

  const activeThisWeek = weeklyActiveDays(entries, weekStart);
  const activeLastWeek = weeklyActiveDays(entries, addDays(weekStart, -7));
  const activeMonth = monthCounts.reduce((a, b) => a + b, 0);
  const monthDelta = activeMonth - 0; // previous month data is beyond the seed horizon

  const weights = useMemo(
    () =>
      entries
        .filter((e): e is LogEntry & { data: { kind: 'weight'; kg: number } } =>
          !e.deleted && e.data.kind === 'weight',
        )
        .sort((a, b) => a.ts - b.ts),
    [entries],
  );

  const bests = useMemo(() => {
    const monthStart = addDays(today, -30);
    let longestRun = 0;
    let bestSteps = 0;
    let anyWorkout = false;
    for (const e of entries) {
      if (e.deleted || e.day < monthStart) continue;
      if (e.data.kind === 'run') longestRun = Math.max(longestRun, e.data.km);
      if (e.data.kind === 'steps') bestSteps = Math.max(bestSteps, e.data.count);
      if (e.data.kind === 'workout') anyWorkout = true;
    }
    bestSteps = Math.max(bestSteps, healthFor(false).todaySteps());
    return { longestRun, bestSteps, anyWorkout, lift: bestLift(entries, monthStart) };
  }, [entries, today]);

  const segBtn = (label: string, value: 'week' | 'month') => {
    const on = period === value;
    return (
      <Pressable98
        key={value}
        onPress={() => setPeriod(value)}
        style={{
          paddingVertical: 6,
          paddingHorizontal: 14,
          borderRadius: 999,
          backgroundColor: on ? colors.accent : 'transparent',
        }}
      >
        <Txt size={12} w={800} color={on ? colors.ink : colors.mutedDark}>
          {label}
        </Txt>
      </Pressable98>
    );
  };

  const bars = isWeek
    ? weekCounts.map((count, i) => {
        const day = addDays(weekStart, i);
        const future = day > today;
        const isToday = day === today;
        return { label: DAY_LABELS[i]!, count, future, isToday };
      })
    : monthCounts.map((count, i) => ({
        label: `W${i + 1}`,
        count,
        future: false,
        isToday: i === 3,
      }));

  const delta = isWeek
    ? firstWeek
      ? 'week 1 — go'
      : `${activeThisWeek - activeLastWeek >= 0 ? '▴' : '▾'} ${Math.abs(activeThisWeek - activeLastWeek)} vs last week`
    : firstWeek
      ? 'week 1 — go'
      : `▴ ${monthDelta} vs last month`;

  const weightDelta30 = useMemo(() => {
    if (weights.length < 2) return null;
    const cutoff = addDays(today, -30);
    const old = weights.find((w) => w.day >= cutoff) ?? weights[0]!;
    const latest = weights[weights.length - 1]!;
    return latest.data.kg - old.data.kg;
  }, [weights, today]);

  // Normalize the weight history into the prototype's 300x52 polyline box.
  const weightLine = useMemo(() => {
    if (weights.length < 2) return null;
    const recent = weights.slice(-8);
    const kgs = recent.map((w) => w.data.kg);
    const min = Math.min(...kgs);
    const max = Math.max(...kgs);
    const span = Math.max(0.1, max - min);
    const pts = recent.map((w, i) => {
      const x = (i / (recent.length - 1)) * 300;
      const y = 10 + ((max - w.data.kg) / span) * 28;
      return `${Math.round(x)},${Math.round(y)}`;
    });
    const lastPt = pts[pts.length - 1]!.split(',');
    return { pts: pts.join(' '), cx: Number(lastPt[0]), cy: Number(lastPt[1]) };
  }, [weights]);

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.appBg }}
      contentContainerStyle={{ paddingTop: 64, paddingHorizontal: 20, gap: 14, paddingBottom: 20 }}
    >
      <View
        style={{ flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between' }}
      >
        <Txt size={34} w={900} ls={-0.02} lineHeight={1.05}>
          Trends
        </Txt>
        <View
          style={{
            flexDirection: 'row',
            backgroundColor: colors.tile,
            borderRadius: 999,
            padding: 3,
          }}
        >
          {segBtn('Week', 'week')}
          {segBtn('Month', 'month')}
        </View>
      </View>

      <Card>
        <View
          style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}
        >
          <View>
            <Txt size={11} w={700} ls={0.06} upper color={colors.mutedDark}>
              Active days
            </Txt>
            <Txt size={44} w={900} ls={-0.03} lineHeight={1.1}>
              {isWeek ? activeThisWeek : activeMonth}
              <Txt size={20} w={700} color={colors.mutedDark}>
                {' '}
                {isWeek ? '/ 7' : '/ 30'}
              </Txt>
            </Txt>
          </View>
          <Txt size={12} w={800} color={colors.accentOnDark}>
            {delta}
          </Txt>
        </View>
        <View
          style={{
            flexDirection: 'row',
            gap: 6,
            marginTop: 14,
            alignItems: 'flex-end',
            height: 64 + 15,
          }}
        >
          {bars.map((b, i) => (
            <View
              key={i}
              style={{ flex: 1, alignItems: 'center', gap: 5, justifyContent: 'flex-end' }}
            >
              {b.future || (b.isToday && b.count === 0 && isWeek) ? (
                <View
                  style={{
                    width: '100%',
                    height: 8,
                    borderRadius: 6,
                    borderWidth: 1.5,
                    borderStyle: 'dashed',
                    borderColor: 'rgba(255,255,255,.2)',
                  }}
                />
              ) : (
                <View
                  style={{
                    width: '100%',
                    height: barHeight(b.count),
                    borderRadius: 6,
                    backgroundColor: b.count > 0 ? colors.accent : 'rgba(255,255,255,.12)',
                    shadowColor: b.isToday && b.count > 0 ? colors.accentOnDark : 'transparent',
                    shadowOpacity: b.isToday && b.count > 0 ? 0.4 : 0,
                    shadowRadius: 2,
                    shadowOffset: { width: 0, height: 0 },
                  }}
                />
              )}
              <Txt
                size={10}
                w={b.isToday ? 800 : 700}
                color={b.future ? '#4a544a' : b.isToday ? colors.white : colors.mutedDark}
              >
                {b.label}
              </Txt>
            </View>
          ))}
        </View>
      </Card>

      <Card>
        {weightLine ? (
          <>
            <View
              style={{
                flexDirection: 'row',
                justifyContent: 'space-between',
                alignItems: 'baseline',
              }}
            >
              <Txt size={11} w={700} ls={0.06} upper color={colors.mutedDark}>
                Weight
              </Txt>
              {weightDelta30 !== null ? (
                <Txt size={12} w={800} color={colors.accentOnDark}>
                  {weightDelta30 <= 0 ? '▾' : '▴'}{' '}
                  {(imperial ? kgToLb(Math.abs(weightDelta30)) : Math.abs(weightDelta30)).toFixed(
                    1,
                  )}{' '}
                  {imperial ? 'lb' : 'kg'} in 30 days
                </Txt>
              ) : null}
            </View>
            <View
              style={{ flexDirection: 'row', alignItems: 'baseline', gap: 8, marginTop: 2 }}
            >
              <Txt size={28} w={900}>
                {(imperial
                  ? kgToLb(weights[weights.length - 1]!.data.kg)
                  : weights[weights.length - 1]!.data.kg
                ).toFixed(1)}
              </Txt>
              <Txt size={13} w={700} color={colors.mutedDark}>
                {imperial ? 'lb' : 'kg'}
              </Txt>
            </View>
            <Svg
              width="100%"
              height={52}
              viewBox="0 0 300 52"
              preserveAspectRatio="none"
              style={{ marginTop: 6 }}
            >
              <Polyline
                points={weightLine.pts}
                fill="none"
                stroke={colors.accent}
                strokeWidth={3}
                strokeLinecap="round"
              />
              <Circle cx={weightLine.cx} cy={weightLine.cy} r={4} fill={colors.accentOnDark} />
            </Svg>
          </>
        ) : (
          <>
            <Txt size={11} w={700} ls={0.06} upper color={colors.mutedDark}>
              Weight
            </Txt>
            <View
              style={{
                marginTop: 12,
                height: 2,
                borderRadius: 1,
                borderWidth: 1,
                borderStyle: 'dashed',
                borderColor: 'rgba(255,255,255,.25)',
              }}
            />
            <Txt
              size={12.5}
              w={600}
              color={colors.mutedDark}
              lineHeight={1.5}
              style={{ marginTop: 12 }}
            >
              {weights.length === 1
                ? `One entry so far (${formatWeight(weights[0]!.data.kg, units)}). Log it again in a few days and the trend line starts here.`
                : 'Log your weight and the trend line starts here.'}
            </Txt>
          </>
        )}
      </Card>

      <Card>
        <Txt size={11} w={700} ls={0.06} upper color={colors.mutedDark}>
          {bests.longestRun > 0 || bests.anyWorkout ? 'Bests this month' : 'Bests'}
        </Txt>
        {bests.longestRun > 0 || bests.anyWorkout ? (
          <View style={{ flexDirection: 'row', gap: 20, marginTop: 12 }}>
            <View style={{ flex: 1 }}>
              <Txt size={17} w={900}>
                {bests.lift ? formatWeight(bests.lift.kg, units) : '—'}
              </Txt>
              <Txt size={10.5} w={600} color={colors.mutedDark}>
                {bests.lift ? bests.lift.exercise.toLowerCase() : 'top lift'}
              </Txt>
            </View>
            <View style={{ flex: 1 }}>
              <Txt size={17} w={900}>
                {bests.longestRun > 0 ? formatDistance(bests.longestRun, units) : '—'}
              </Txt>
              <Txt size={10.5} w={600} color={colors.mutedDark}>
                longest run
              </Txt>
            </View>
            <View style={{ flex: 1 }}>
              <Txt size={17} w={900}>
                {bests.bestSteps.toLocaleString('en-US')}
              </Txt>
              <Txt size={10.5} w={600} color={colors.mutedDark}>
                best step day
              </Txt>
            </View>
          </View>
        ) : (
          <Txt
            size={12.5}
            w={600}
            color={colors.mutedDark}
            lineHeight={1.5}
            style={{ marginTop: 10 }}
          >
            Your first bench press, longest run and best step day will land here. Charts get good
            after a week — you're {daysIn} {daysIn === 1 ? 'day' : 'days'} in.
          </Txt>
        )}
      </Card>
    </ScrollView>
  );
}
