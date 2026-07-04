import { useMemo, useState } from 'react';
import {
  addDays,
  bestLift,
  monthWeekCounts,
  weekDayCounts,
  weekStartOf,
  weeklyActiveDays,
  type LogEntry,
} from '@streka/core';
import { colors } from '@streka/tokens';
import { useLogs } from '../core';
import { todayStr, useIsMobile } from '../lib';
import { Card, TileLabel, WeekBars } from '../components/bits';

const DAY_LABELS = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];

export function Trends() {
  const mobile = useIsMobile();
  const entries = useLogs((s) => s.entries);
  const [period, setPeriod] = useState<'week' | 'month'>('week');
  const isWeek = period === 'week';
  const today = todayStr();
  const weekStart = weekStartOf(today);

  const weekCounts = useMemo(() => weekDayCounts(entries, weekStart), [entries, weekStart]);
  const monthCounts = useMemo(() => monthWeekCounts(entries, today), [entries, today]);
  const activeWeek = weeklyActiveDays(entries, weekStart);
  const activeLastWeek = weeklyActiveDays(entries, addDays(weekStart, -7));
  const activeMonth = monthCounts.reduce((a, b) => a + b, 0);

  const weights = useMemo(
    () =>
      entries
        .filter(
          (e): e is LogEntry & { data: { kind: 'weight'; kg: number } } =>
            !e.deleted && e.data.kind === 'weight',
        )
        .sort((a, b) => a.ts - b.ts),
    [entries],
  );
  const weightNow = weights.length > 0 ? weights[weights.length - 1]!.data.kg : undefined;
  const weightDelta = useMemo(() => {
    if (weights.length < 2 || weightNow === undefined) return 0;
    const cutoff = addDays(today, -30);
    const old = weights.find((w) => w.day >= cutoff) ?? weights[0]!;
    return weightNow - old.data.kg;
  }, [weights, weightNow, today]);

  const line = useMemo(() => {
    if (weights.length < 2) return null;
    const recent = weights.slice(-8);
    const kgs = recent.map((w) => w.data.kg);
    const min = Math.min(...kgs);
    const span = Math.max(0.1, Math.max(...kgs) - min);
    const pts = recent.map((w, i) => {
      const x = Math.round((i / (recent.length - 1)) * 300);
      const y = Math.round(10 + ((Math.max(...kgs) - w.data.kg) / span) * 28);
      return [x, y] as const;
    });
    return { path: pts.map((p) => p.join(',')).join(' '), last: pts[pts.length - 1]! };
  }, [weights]);

  const bests = useMemo(() => {
    const monthStart = addDays(today, -30);
    let longestRun = 0;
    for (const e of entries) {
      if (e.deleted || e.day < monthStart) continue;
      if (e.data.kind === 'run') longestRun = Math.max(longestRun, e.data.km);
    }
    return { longestRun, lift: bestLift(entries, monthStart) };
  }, [entries, today]);

  const bars = isWeek
    ? weekCounts.map((count, i) => ({
        h: count === 0 ? 10 : Math.min(58, 21 + count * 13),
        on: count > 0,
        label: DAY_LABELS[i]!,
        today: addDays(weekStart, i) === today,
      }))
    : monthCounts.map((count, i) => ({
        h: count === 0 ? 10 : Math.min(58, 10 + count * 7),
        on: count > 0,
        label: `W${i + 1}`,
      }));

  const seg = (label: string, value: 'week' | 'month') => {
    const on = period === value;
    return (
      <div
        key={value}
        onClick={() => setPeriod(value)}
        style={{
          padding: '7px 16px',
          borderRadius: 999,
          background: on ? colors.appBg : 'transparent',
          color: on ? '#fff' : colors.mutedLight,
          fontSize: 12.5,
          fontWeight: 800,
          cursor: 'pointer',
        }}
      >
        {label}
      </div>
    );
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <div
        style={{
          display: 'flex',
          alignItems: 'flex-end',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: 10,
          padding: '6px 2px 4px',
        }}
      >
        <div
          style={{
            fontSize: 'clamp(28px,3.4vw,38px)',
            fontWeight: 900,
            letterSpacing: '-.02em',
            lineHeight: 1.05,
          }}
        >
          Trends
        </div>
        <div
          style={{
            display: 'flex',
            background: '#fff',
            border: '1px solid rgba(0,0,0,.07)',
            borderRadius: 999,
            padding: 3,
          }}
        >
          {seg('Week', 'week')}
          {seg('Month', 'month')}
        </div>
      </div>

      <div
        style={{ display: 'grid', gridTemplateColumns: mobile ? '1fr' : '1fr 1fr', gap: 12 }}
      >
        <Card style={{ padding: 22 }}>
          <div
            style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}
          >
            <div>
              <TileLabel>Active days</TileLabel>
              <div
                style={{
                  fontSize: 44,
                  fontWeight: 900,
                  letterSpacing: '-.03em',
                  lineHeight: 1.1,
                }}
              >
                {isWeek ? activeWeek : activeMonth}
                <span style={{ fontSize: 20, color: colors.mutedLight, fontWeight: 700 }}>
                  {' '}
                  {isWeek ? '/ 7' : '/ 30'}
                </span>
              </div>
            </div>
            <div style={{ fontSize: 12, fontWeight: 800, color: colors.accentOnLight }}>
              {isWeek
                ? `${activeWeek - activeLastWeek >= 0 ? '▴' : '▾'} ${Math.abs(activeWeek - activeLastWeek)} vs last week`
                : `▴ ${activeMonth} vs last month`}
            </div>
          </div>
          <WeekBars bars={bars} height={72} />
        </Card>

        <Card style={{ padding: 22 }}>
          <div
            style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}
          >
            <TileLabel>Weight</TileLabel>
            {weights.length >= 2 ? (
              <div style={{ fontSize: 12, fontWeight: 800, color: colors.accentOnLight }}>
                {weightDelta <= 0 ? '▾' : '▴'} {Math.abs(weightDelta).toFixed(1)} kg in 30 days
              </div>
            ) : null}
          </div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginTop: 4 }}>
            <div style={{ fontSize: 32, fontWeight: 900 }}>
              {weightNow !== undefined ? weightNow.toFixed(1) : '-'}
            </div>
            <div style={{ fontSize: 13, fontWeight: 700, color: colors.mutedLight }}>kg</div>
          </div>
          {line ? (
            <svg
              width="100%"
              height="64"
              viewBox="0 0 300 52"
              preserveAspectRatio="none"
              style={{ marginTop: 8, display: 'block' }}
            >
              <polyline
                points={line.path}
                fill="none"
                stroke={colors.accent}
                strokeWidth={3}
                strokeLinecap="round"
              />
              <circle cx={line.last[0]} cy={line.last[1]} r={4} fill={colors.accentOnLight} />
            </svg>
          ) : null}
        </Card>

        <Card style={{ padding: 22 }}>
          <TileLabel>Bests this month</TileLabel>
          <div style={{ display: 'flex', gap: 24, marginTop: 14, flexWrap: 'wrap' }}>
            <div>
              <div style={{ fontSize: 22, fontWeight: 900 }}>
                {bests.lift ? `${bests.lift.kg} kg` : '-'}
              </div>
              <div style={{ fontSize: 11, fontWeight: 600, color: colors.mutedLight }}>
                {bests.lift ? bests.lift.exercise.toLowerCase() : 'top lift'}
              </div>
            </div>
            <div>
              <div style={{ fontSize: 22, fontWeight: 900 }}>
                {bests.longestRun.toFixed(1)} km
              </div>
              <div style={{ fontSize: 11, fontWeight: 600, color: colors.mutedLight }}>
                longest run
              </div>
            </div>
          </div>
        </Card>

        <Card dark style={{ borderRadius: 20 }}>
          <TileLabel dark>Consistency · last 3 weeks</TileLabel>
          <ConsistencyGrid />
        </Card>
      </div>
    </div>
  );
}

// 21-day dot grid derived from intentional-log days (dark card, Web:192-199).
function ConsistencyGrid() {
  const entries = useLogs((s) => s.entries);
  const today = todayStr();
  const days = useMemo(() => {
    const set = new Set<string>();
    for (const e of entries) if (!e.deleted && e.source !== 'health') set.add(e.day);
    return set;
  }, [entries]);

  const cells = Array.from({ length: 21 }, (_, i) => {
    const day = addDays(today, i - 20);
    const logged = days.has(day);
    const isToday = day === today;
    return { logged, isToday };
  });

  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(7, 1fr)',
        gap: 5,
        marginTop: 14,
        maxWidth: 260,
      }}
    >
      {cells.map((c, i) => (
        <div
          key={i}
          style={{
            aspectRatio: '1',
            borderRadius: 5,
            background: c.isToday && c.logged
              ? colors.accentOnDark
              : c.logged
                ? colors.accent
                : 'rgba(255,255,255,.12)',
            boxShadow: c.isToday && c.logged ? '0 0 0 1.5px rgba(63,224,127,.5)' : undefined,
          }}
        />
      ))}
    </div>
  );
}
