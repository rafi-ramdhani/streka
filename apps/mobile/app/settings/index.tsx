import DateTimePicker from '@react-native-community/datetimepicker';
import { router } from 'expo-router';
import { useState } from 'react';
import { ScrollView, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { useSettings, useSync } from '../../src/core';
import { nudgesSupported } from '../../src/nudges';
import { goBack } from '../../src/lib/nav';
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

// The two daily targets the design shipped as fixed defaults. They have no
// designed editor, but "% of goal" is meaningless if the goal never fits the
// person, so Settings gets a stepper for each (interim, flagged in the TAD).
const GOALS: Record<'kcal' | 'steps', { title: string; unit: string; step: number; min: number }> = {
  kcal: { title: 'Daily calorie goal', unit: 'kcal', step: 50, min: 800 },
  steps: { title: 'Daily step goal', unit: 'steps', step: 500, min: 2000 },
};

// Settings (canvas 10b): everything set in onboarding, editable in one screen.
// Reachable via the /settings route only; a visible entry point is an open
// item for the owner (TAD, Gaps 1).
export default function Settings() {
  const settings = useSettings();
  const online = useSync((s) => s.online);
  const pad = useScreenPad();
  const [timeSheet, setTimeSheet] = useState(false);
  const [draftTime, setDraftTime] = useState(() => {
    const [h = 17, m = 30] = settings.nudge.time.split(':').map(Number);
    const d = new Date();
    d.setHours(h, m, 0, 0);
    return d;
  });

  const [goalKind, setGoalKind] = useState<'kcal' | 'steps' | null>(null);
  const [goalDraft, setGoalDraft] = useState(0);
  const openGoal = (kind: 'kcal' | 'steps') => {
    setGoalDraft(kind === 'kcal' ? settings.kcalGoal : settings.stepsGoalDay);
    setGoalKind(kind);
  };
  const goalSpec = goalKind ? GOALS[goalKind] : null;

  const trackerCount = Object.values(settings.picked).filter(Boolean).length;
  const rightLabel = (label: string) => (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
      <Txt size={12} w={700} color={colors.mutedDark}>
        {label}
      </Txt>
      <Chevron />
    </View>
  );

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
      <Pressable98
        onPress={() => goBack()}
        hitSlop={12}
        scaleTo={0.9}
        style={{ alignSelf: 'flex-start', paddingVertical: 2, flexDirection: 'row', alignItems: 'center', gap: 8 }}
      >
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
        <Txt size={13} w={800} color={colors.mutedDark}>
          Board
        </Txt>
      </Pressable98>

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
          title="Reorder board"
          sub="Drag tiles into the order you want"
          right={<Chevron />}
          onPress={() => router.push('/settings/reorder')}
        />
        <Row
          title="Weekly rhythm"
          right={rightLabel(`${settings.rhythmDays} active days`)}
          onPress={() => router.push('/settings/rhythm')}
        />
        <Row
          title="Nudge"
          sub={
            nudgesSupported
              ? `Days you haven't logged · ${settings.nudge.time}`
              : 'Reminders need the installed app (not Expo Go on Android)'
          }
          onPress={nudgesSupported ? () => setTimeSheet(true) : undefined}
          right={
            <Toggle
              on={settings.nudge.enabled && nudgesSupported}
              disabled={!nudgesSupported}
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
          title="Daily calorie goal"
          sub="What the meals tile counts against"
          right={rightLabel(`${settings.kcalGoal.toLocaleString('en-US')} kcal`)}
          onPress={() => openGoal('kcal')}
        />
        <Row
          title="Daily step goal"
          sub="What the steps tile counts against"
          right={rightLabel(settings.stepsGoalDay.toLocaleString('en-US'))}
          onPress={() => openGoal('steps')}
          last
        />
      </Group>

      {settings.hasAccount ? (
        <Group>
          <Row
            title="Sign out"
            sub="Your data stays on this phone and in your account"
            onPress={() => settings.set({ hasAccount: false })}
            last
          />
        </Group>
      ) : null}

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

      <LogSheet
        title={goalSpec?.title ?? ''}
        visible={goalKind !== null}
        onClose={() => setGoalKind(null)}
      >
        {goalSpec ? (
          <>
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 22,
                paddingVertical: 8,
              }}
            >
              <GoalStep
                label="−"
                onPress={() =>
                  setGoalDraft((v) => Math.max(goalSpec.min, v - goalSpec.step))
                }
              />
              <View style={{ alignItems: 'center', minWidth: 150 }}>
                <Txt size={44} w={900} ls={-0.03} tabular>
                  {goalDraft.toLocaleString('en-US')}
                </Txt>
                <Txt size={12} w={700} color={colors.mutedDark}>
                  {goalSpec.unit}
                </Txt>
              </View>
              <GoalStep label="+" onPress={() => setGoalDraft((v) => v + goalSpec.step)} />
            </View>
            <BigButton
              label="SAVE GOAL"
              pad={15}
              onPress={() => {
                if (goalKind === 'kcal') settings.set({ kcalGoal: goalDraft });
                // Keep the weekly steps target the Goals screen shows in step
                // with the daily one the Board counts against.
                else settings.set({ stepsGoalDay: goalDraft, stepsGoalWeek: goalDraft * 7 });
                setGoalKind(null);
              }}
            />
          </>
        ) : null}
      </LogSheet>
    </ScrollView>
  );
}

function GoalStep({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <Pressable98
      onPress={onPress}
      scaleTo={0.92}
      style={{
        width: 52,
        height: 52,
        borderRadius: 26,
        backgroundColor: 'rgba(255,255,255,.08)',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <Txt size={26} w={800}>
        {label}
      </Txt>
    </Pressable98>
  );
}
