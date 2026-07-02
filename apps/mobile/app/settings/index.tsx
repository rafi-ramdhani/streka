import DateTimePicker from '@react-native-community/datetimepicker';
import { router } from 'expo-router';
import { useState } from 'react';
import { ScrollView, Share, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { useLogs, useSettings, useSync } from '../../src/core';
import { healthAppName, requestHealthPermissions } from '../../src/health';
import { useScreenPad } from '../../src/lib/screenPad';
import { BigButton } from '../../src/components/BigButton';
import { LogSheet } from '../../src/components/LogSheet';
import { Pressable98 } from '../../src/components/Pressable98';
import { Toggle } from '../../src/components/Toggle';
import { Txt } from '../../src/components/Txt';
import { colors } from '../../src/theme';

function Chevron() {
  return (
    <Svg width={7} height={12} viewBox="0 0 7 12">
      <Path
        d="M1 1l5 5-5 5"
        stroke={colors.mutedLight}
        strokeWidth={2}
        fill="none"
        strokeLinecap="round"
      />
    </Svg>
  );
}

function Row({
  title,
  sub,
  subColor,
  right,
  onPress,
  last,
}: {
  title: string;
  sub?: string;
  subColor?: string;
  right?: React.ReactNode;
  onPress?: () => void;
  last?: boolean;
}) {
  return (
    <Pressable98
      onPress={onPress}
      disabled={!onPress}
      style={{
        paddingVertical: 15,
        paddingHorizontal: 16,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        borderBottomWidth: last ? 0 : 1,
        borderBottomColor: 'rgba(255,255,255,.06)',
        minHeight: 44,
      }}
    >
      <View style={{ flex: 1, paddingRight: 12 }}>
        <Txt size={14} w={800} color={title === 'Sign out' ? colors.danger : colors.white}>
          {title}
        </Txt>
        {sub ? (
          <Txt size={11} w={600} color={subColor ?? colors.mutedDark} style={{ marginTop: 1 }}>
            {sub}
          </Txt>
        ) : null}
      </View>
      {right}
    </Pressable98>
  );
}

function Group({ children }: { children: React.ReactNode }) {
  return (
    <View style={{ backgroundColor: colors.tile, borderRadius: 20, overflow: 'hidden' }}>
      {children}
    </View>
  );
}

// Settings (canvas 10b): everything set in onboarding, editable in one screen.
// Reachable via the /settings route only; a visible entry point is an open
// item for the owner (TAD, Gaps 1).
export default function Settings() {
  const settings = useSettings();
  const online = useSync((s) => s.online);
  const entries = useLogs((s) => s.entries);
  const pad = useScreenPad();
  const [timeSheet, setTimeSheet] = useState(false);
  const [draftTime, setDraftTime] = useState(() => {
    const [h = 17, m = 30] = settings.nudge.time.split(':').map(Number);
    const d = new Date();
    d.setHours(h, m, 0, 0);
    return d;
  });

  const trackerCount = Object.values(settings.picked).filter(Boolean).length;
  const rightLabel = (label: string) => (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
      <Txt size={12} w={700} color={colors.mutedDark}>
        {label}
      </Txt>
      <Chevron />
    </View>
  );

  const exportCsv = () => {
    const header = 'id,timestamp,day,tracker,source,kind,value';
    const rows = entries
      .filter((e) => !e.deleted)
      .map((e) => {
        const d = e.data;
        const value =
          d.kind === 'workout'
            ? `${d.name} ${d.mins}min`
            : d.kind === 'meal'
              ? `${d.kcal}kcal`
              : d.kind === 'run'
                ? `${d.km}km`
                : d.kind === 'swim'
                  ? `${d.m}m`
                  : d.kind === 'weight'
                    ? `${d.kg}kg`
                    : d.kind === 'steps'
                      ? `${d.count}`
                      : d.kind === 'sleep'
                        ? `${d.hours}h${d.minutes}m`
                        : 'done';
        return `${e.id},${new Date(e.ts).toISOString()},${e.day},${e.tracker},${e.source},${d.kind},${value}`;
      });
    void Share.share({ message: [header, ...rows].join('\n') });
  };

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.appBg }}
      contentContainerStyle={{
        paddingTop: pad.top,
        paddingHorizontal: 20,
        gap: 14,
        paddingBottom: 30,
      }}
    >
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: 14,
          paddingTop: 4,
          paddingBottom: 6,
        }}
      >
        <View
          style={{
            width: 54,
            height: 54,
            borderRadius: 27,
            backgroundColor: '#d8e4d6',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Txt size={19} w={800} color="#3a4a3a">
            {settings.hasAccount ? 'JT' : '—'}
          </Txt>
        </View>
        <View>
          <Txt size={19} w={900}>
            {settings.hasAccount ? 'Jamie T.' : 'You'}
          </Txt>
          <View
            style={{ flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 2 }}
          >
            <View
              style={{
                width: 6,
                height: 6,
                borderRadius: 3,
                backgroundColor: settings.hasAccount && online ? colors.accent : colors.mutedLight,
              }}
            />
            <Txt
              size={11.5}
              w={700}
              color={settings.hasAccount && online ? colors.accentOnDark : colors.mutedDark}
            >
              {settings.hasAccount
                ? online
                  ? 'Account synced · jamie@example.com'
                  : 'Offline · will sync'
                : 'On this phone · no account'}
            </Txt>
          </View>
        </View>
      </View>

      <Group>
        <Row
          title="My board"
          right={rightLabel(`${trackerCount} trackers`)}
          onPress={() => router.push('/settings/board')}
        />
        <Row
          title="Weekly rhythm"
          right={rightLabel(`${settings.rhythmDays} active days`)}
          onPress={() => router.push('/settings/rhythm')}
        />
        <Row
          title="Nudge"
          sub={`Days you haven't logged · ${settings.nudge.time}`}
          onPress={() => setTimeSheet(true)}
          right={
            <Toggle
              on={settings.nudge.enabled}
              onToggle={() =>
                settings.set({ nudge: { ...settings.nudge, enabled: !settings.nudge.enabled } })
              }
            />
          }
          last
        />
      </Group>

      <Group>
        <Row
          title={healthAppName}
          sub={settings.healthConnected ? 'Connected · steps, sleep, runs' : 'Not connected'}
          subColor={settings.healthConnected ? colors.accentOnDark : colors.mutedDark}
          right={<Chevron />}
          onPress={() => {
            const on = !settings.healthConnected;
            settings.set({ healthConnected: on });
            if (on) void requestHealthPermissions();
          }}
        />
        <Row
          title="Units"
          right={rightLabel(settings.units === 'metric' ? 'kg · km' : 'lb · mi')}
          onPress={() =>
            settings.set({ units: settings.units === 'metric' ? 'imperial' : 'metric' })
          }
          last
        />
      </Group>

      <Group>
        <Row
          title="Export my data"
          sub="Everything as CSV — it's yours"
          right={<Chevron />}
          onPress={exportCsv}
          last={!settings.hasAccount}
        />
        {settings.hasAccount ? (
          <Row
            title="Sign out"
            sub="Your data stays on this phone and in your account"
            onPress={() => settings.set({ hasAccount: false })}
            last
          />
        ) : null}
      </Group>

      <Txt size={10.5} w={600} color="#4a544a" center style={{ paddingTop: 2, paddingBottom: 10 }}>
        Streka 1.0 · made for keeping up
      </Txt>

      <LogSheet title="Nudge time" visible={timeSheet} onClose={() => setTimeSheet(false)}>
        <View style={{ alignItems: 'center' }}>
          <DateTimePicker
            value={draftTime}
            mode="time"
            display="spinner"
            themeVariant="dark"
            onChange={(_, date) => {
              if (date) setDraftTime(date);
            }}
          />
        </View>
        <BigButton
          label="SAVE TIME"
          pad={15}
          onPress={() => {
            setTimeSheet(false);
            const hh = String(draftTime.getHours()).padStart(2, '0');
            const mm = String(draftTime.getMinutes()).padStart(2, '0');
            settings.set({ nudge: { ...settings.nudge, time: `${hh}:${mm}` } });
          }}
        />
      </LogSheet>
    </ScrollView>
  );
}
