import { useMemo, useState } from 'react';
import { ScrollView, View } from 'react-native';
import {
  dayOf,
  formatWeight,
  kgToLb,
  weekStartOf,
  weeklyActiveDays,
  type LogEntry,
} from '@streka/core';
import { useLogs, useSettings } from '../../src/core';
import { useHealthToday } from '../../src/health';
import { ProgressSegments } from '../../src/components/ProgressSegments';
import { Pressable98 } from '../../src/components/Pressable98';
import { Toggle } from '../../src/components/Toggle';
import { Txt } from '../../src/components/Txt';
import { colors } from '../../src/theme';

function Card({ children }: { children: React.ReactNode }) {
  return (
    <View style={{ backgroundColor: colors.tile, borderRadius: 22, padding: 18, gap: 12 }}>
      {children}
    </View>
  );
}

function Bar({ pct }: { pct: number }) {
  return (
    <View
      style={{ height: 8, borderRadius: 4, backgroundColor: 'rgba(255,255,255,.12)' }}
    >
      <View
        style={{
          width: `${Math.min(100, Math.max(0, pct))}%`,
          height: '100%',
          borderRadius: 4,
          backgroundColor: colors.accent,
        }}
      />
    </View>
  );
}

export default function Goals() {
  const settings = useSettings();
  const entries = useLogs((s) => s.entries);
  const [stepsNudge, setStepsNudge] = useState(false);
  const today = dayOf(Date.now());
  const weekStart = weekStartOf(today);

  const fresh = useMemo(() => entries.every((e) => e.day === today), [entries, today]);
  const active = weeklyActiveDays(entries, weekStart);
  const goalCount = Math.min(settings.rhythmDays, active);

  // Monday-based index of today; the header counts today as remaining.
  const dayIdx = Math.round((Date.parse(today) - Date.parse(weekStart)) / 86_400_000);
  const daysLeft = 7 - dayIdx;

  // Steps this week: health entries in-week plus today's live count.
  const health = useHealthToday();
  const weekSteps = useMemo(() => {
    let sum = health.steps ?? 0;
    for (const e of entries) {
      if (e.deleted || e.data.kind !== 'steps' || e.day < weekStart || e.day >= today) continue;
      sum += e.data.count;
    }
    return sum;
  }, [entries, weekStart, today, health.steps]);
  const stepsPct = Math.round((weekSteps / settings.stepsGoalWeek) * 100);

  const weights = useMemo(
    () =>
      entries
        .filter((e): e is LogEntry & { data: { kind: 'weight'; kg: number } } =>
          !e.deleted && e.data.kind === 'weight',
        )
        .sort((a, b) => a.ts - b.ts),
    [entries],
  );
  const startKg = weights[0]?.data.kg;
  const nowKg = weights[weights.length - 1]?.data.kg;
  const TARGET_KG = 70;
  const weightPct =
    startKg !== undefined && nowKg !== undefined && startKg > TARGET_KG
      ? ((startKg - nowKg) / (startKg - TARGET_KG)) * 100
      : 0;

  const startLabel =
    startKg !== undefined ? formatWeight(startKg, settings.units) : undefined;
  const paceLine = useMemo(() => {
    if (startKg === undefined || nowKg === undefined || weights.length < 2)
      return startLabel !== undefined
        ? `Started at ${startLabel} · log again to see a pace`
        : 'Log your weight to start this goal';
    const first = weights[0]!;
    const last = weights[weights.length - 1]!;
    const daysSpan = Math.max(
      1,
      (Date.parse(last.day) - Date.parse(first.day)) / 86_400_000,
    );
    const perDay = (first.data.kg - last.data.kg) / daysSpan;
    if (perDay <= 0) return `Started at ${startLabel}`;
    const daysToGo = (nowKg - TARGET_KG) / perDay;
    const eta = new Date(Date.now() + daysToGo * 86_400_000);
    const part = eta.getDate() <= 10 ? 'early' : eta.getDate() <= 20 ? 'mid' : 'late';
    const month = eta.toLocaleDateString('en-US', { month: 'short' });
    return `Started at ${startLabel} · on pace for ${part} ${month}`;
  }, [weights, startKg, nowKg, startLabel]);

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.appBg }}
      contentContainerStyle={{ paddingTop: 64, paddingHorizontal: 20, gap: 14, paddingBottom: 20 }}
    >
      <View>
        <Txt size={12} w={600} ls={0.08} upper color={colors.mutedDark}>
          This week · {daysLeft} {daysLeft === 1 ? 'day' : 'days'} left
        </Txt>
        <Txt size={34} w={900} ls={-0.02} lineHeight={1.05}>
          Goals
        </Txt>
      </View>

      <Card>
        <View
          style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}
        >
          <Txt size={16} w={900}>
            Active {settings.rhythmDays} days a week
          </Txt>
          <Txt size={13} w={900} color={colors.accentOnDark}>
            {goalCount} / {settings.rhythmDays}
          </Txt>
        </View>
        <ProgressSegments
          total={settings.rhythmDays}
          filled={goalCount}
          height={8}
          offColor="rgba(255,255,255,.12)"
        />
        <View
          style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}
        >
          <Txt size={11.5} w={600} color={colors.mutedDark}>
            Nudge: on days you haven't logged, {settings.nudge.time}
          </Txt>
          <Toggle
            on={settings.nudge.enabled}
            onToggle={() =>
              settings.set({ nudge: { ...settings.nudge, enabled: !settings.nudge.enabled } })
            }
          />
        </View>
      </Card>

      <Card>
        <View
          style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}
        >
          <Txt size={16} w={900}>
            70,000 steps a week
          </Txt>
          <Txt size={13} w={900} color={colors.accentOnDark}>
            {stepsPct}%
          </Txt>
        </View>
        <Bar pct={stepsPct} />
        <View
          style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}
        >
          <Txt size={11.5} w={600} color={colors.mutedDark}>
            {weekSteps.toLocaleString('en-US')} done · auto from watch
          </Txt>
          <Toggle on={stepsNudge} onToggle={() => setStepsNudge((v) => !v)} />
        </View>
      </Card>

      <Card>
        <View
          style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}
        >
          <Txt size={16} w={900}>
            Reach {settings.units === 'imperial' ? `${kgToLb(TARGET_KG).toFixed(0)} lb` : '70 kg'}
          </Txt>
          <Txt size={13} w={900} color={colors.mutedDark}>
            {nowKg !== undefined
              ? `${(settings.units === 'imperial' ? kgToLb(nowKg) : nowKg).toFixed(1)} now`
              : '—'}
          </Txt>
        </View>
        <Bar pct={weightPct} />
        <Txt size={11.5} w={600} color={colors.mutedDark}>
          {paceLine}
        </Txt>
      </Card>

      <Pressable98
        style={{
          borderWidth: 1.5,
          borderStyle: 'dashed',
          borderColor: 'rgba(255,255,255,.22)',
          borderRadius: 18,
          padding: 14,
          alignItems: 'center',
        }}
      >
        <Txt size={13} w={800} color={colors.mutedDark}>
          + New goal
        </Txt>
      </Pressable98>
    </ScrollView>
  );
}
