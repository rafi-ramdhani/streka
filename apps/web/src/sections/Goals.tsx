import { weekStartOf, weeklyActiveDays } from '@streka/core';
import { colors } from '@streka/tokens';
import { useLogs, useSettings } from '../core';
import { todayStr, useIsMobile, updateSettings } from '../lib';
import { Card, Toggle } from '../components/bits';

export function Goals() {
  const mobile = useIsMobile();
  const settings = useSettings();
  const entries = useLogs((s) => s.entries);
  const today = todayStr();
  const weekStart = weekStartOf(today);

  const active = weeklyActiveDays(entries, weekStart);
  const goalCount = Math.min(settings.rhythmDays, active);
  const dayIdx = Math.round((Date.parse(today) - Date.parse(weekStart)) / 86_400_000);
  const daysLeft = 7 - dayIdx;

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

      <div style={{ display: 'grid', gridTemplateColumns: mobile ? '1fr' : '1fr 1fr', gap: 12 }}>
        <Card style={{ padding: 22, display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ fontSize: 16, fontWeight: 900 }}>Active {settings.rhythmDays} days a week</div>
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
            <span>Nudge: days you haven&apos;t logged, {settings.nudge.time}</span>
            <Toggle
              on={settings.nudge.enabled}
              onToggle={() =>
                updateSettings({ nudge: { ...settings.nudge, enabled: !settings.nudge.enabled } })
              }
            />
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
