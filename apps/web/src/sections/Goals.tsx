import { useMemo, useState } from 'react';
import { weekStartOf, weeklyActiveDays, type LogEntry } from '@streka/core';
import { colors } from '@streka/tokens';
import { useLogs, useSettings } from '../core';
import { todayStr, useIsMobile } from '../lib';
import { Card, Toggle } from '../components/bits';

function GoalBar({ pct }: { pct: number }) {
  return (
    <div style={{ height: 8, borderRadius: 4, background: '#eef0ec' }}>
      <div
        style={{
          width: `${Math.min(100, Math.max(0, pct))}%`,
          height: '100%',
          borderRadius: 4,
          background: colors.accent,
        }}
      />
    </div>
  );
}

export function Goals() {
  const mobile = useIsMobile();
  const settings = useSettings();
  const entries = useLogs((s) => s.entries);
  const [stepsNudge, setStepsNudge] = useState(false);
  const today = todayStr();
  const weekStart = weekStartOf(today);

  const active = weeklyActiveDays(entries, weekStart);
  const goalCount = Math.min(settings.rhythmDays, active);
  const dayIdx = Math.round((Date.parse(today) - Date.parse(weekStart)) / 86_400_000);
  const daysLeft = 7 - dayIdx;

  const weekSteps = useMemo(() => {
    let sum = 8246;
    for (const e of entries) {
      if (e.deleted || e.data.kind !== 'steps' || e.day < weekStart || e.day >= today) continue;
      sum += e.data.count;
    }
    return sum;
  }, [entries, weekStart, today]);
  const stepsPct = Math.round((weekSteps / settings.stepsGoalWeek) * 100);

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
  const startKg = weights[0]?.data.kg ?? 73.6;
  const nowKg = weights[weights.length - 1]?.data.kg ?? 72.4;
  const weightPct = startKg > 70 ? ((startKg - nowKg) / (startKg - 70)) * 100 : 0;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <div style={{ padding: '6px 2px 4px' }}>
        <div
          style={{
            fontSize: 12,
            fontWeight: 700,
            letterSpacing: '.08em',
            textTransform: 'uppercase',
            color: colors.mutedLight,
          }}
        >
          This week · {daysLeft} {daysLeft === 1 ? 'day' : 'days'} left
        </div>
        <div
          style={{
            fontSize: 'clamp(28px,3.4vw,38px)',
            fontWeight: 900,
            letterSpacing: '-.02em',
            lineHeight: 1.05,
          }}
        >
          Goals
        </div>
      </div>

      <div
        style={{ display: 'grid', gridTemplateColumns: mobile ? '1fr' : '1fr 1fr', gap: 12 }}
      >
        <Card style={{ padding: 22, display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div
            style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
          >
            <div style={{ fontSize: 16, fontWeight: 900 }}>
              Active {settings.rhythmDays} days a week
            </div>
            <div style={{ fontSize: 13, fontWeight: 900, color: colors.accentOnLight }}>
              {goalCount} / {settings.rhythmDays}
            </div>
          </div>
          <div style={{ display: 'flex', gap: 6 }}>
            {Array.from({ length: settings.rhythmDays }, (_, i) => (
              <div
                key={i}
                style={{
                  flex: 1,
                  height: 8,
                  borderRadius: 4,
                  background: i < goalCount ? colors.accent : '#eef0ec',
                }}
              />
            ))}
          </div>
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              fontSize: 12,
              fontWeight: 600,
              color: colors.mutedLight,
            }}
          >
            <span>Nudge: days you haven't logged, {settings.nudge.time}</span>
            <Toggle
              on={settings.nudge.enabled}
              onToggle={() =>
                settings.set({ nudge: { ...settings.nudge, enabled: !settings.nudge.enabled } })
              }
            />
          </div>
        </Card>

        <Card style={{ padding: 22, display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div
            style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
          >
            <div style={{ fontSize: 16, fontWeight: 900 }}>70,000 steps a week</div>
            <div style={{ fontSize: 13, fontWeight: 900, color: colors.accentOnLight }}>
              {stepsPct}%
            </div>
          </div>
          <GoalBar pct={stepsPct} />
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              fontSize: 12,
              fontWeight: 600,
              color: colors.mutedLight,
            }}
          >
            <span>{weekSteps.toLocaleString('en-US')} done · auto from watch</span>
            <Toggle on={stepsNudge} onToggle={() => setStepsNudge((v) => !v)} />
          </div>
        </Card>

        <Card style={{ padding: 22, display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div
            style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
          >
            <div style={{ fontSize: 16, fontWeight: 900 }}>Reach 70 kg</div>
            <div style={{ fontSize: 13, fontWeight: 900, color: colors.mutedLight }}>
              {nowKg.toFixed(1)} now
            </div>
          </div>
          <GoalBar pct={weightPct} />
          <div style={{ fontSize: 12, fontWeight: 600, color: colors.mutedLight }}>
            Started at {startKg.toFixed(1)} kg · on pace for late Aug
          </div>
        </Card>

        <div
          className="pressable"
          style={{
            border: '1.5px dashed rgba(0,0,0,.18)',
            borderRadius: 20,
            padding: 22,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 13.5,
            fontWeight: 800,
            color: colors.mutedLight,
          }}
        >
          + New goal
        </div>
      </div>
    </div>
  );
}
