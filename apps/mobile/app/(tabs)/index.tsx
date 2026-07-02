import { useLocalSearchParams } from 'expo-router';
import { useMemo, useState } from 'react';
import { ScrollView, View, useWindowDimensions } from 'react-native';
import {
  dayOf,
  intentionalDays,
  prevDay,
  streak,
  todayBoard,
  type LogEntry,
} from '@streka/core';
import { healthFor, logActivity, useLogs, useSettings } from '../../src/core';
import { CoachMark } from '../../src/components/CoachMark';
import { SlashMark } from '../../src/components/SlashMark';
import { StreakChip } from '../../src/components/StreakChip';
import { SyncPill } from '../../src/components/SyncPill';
import { Tile } from '../../src/components/Tile';
import { Toast } from '../../src/components/Toast';
import { Txt } from '../../src/components/Txt';
import { Wordmark } from '../../src/components/Wordmark';
import { LogSheet } from '../../src/components/LogSheet';
import { MealSheet } from '../../src/sheets/MealSheet';
import { RunSheet } from '../../src/sheets/RunSheet';
import { SwimSheet } from '../../src/sheets/SwimSheet';
import { WeightSheet } from '../../src/sheets/WeightSheet';
import { WorkoutSheet } from '../../src/sheets/WorkoutSheet';
import { formatDateLine, shortWeekday } from '../../src/lib/dates';
import { useOnboarding } from '../../src/stores/onboarding';
import { colors } from '../../src/theme';

type SheetName = 'workout' | 'meal' | 'run' | 'weight' | 'swim';

const SHEET_TITLES: Record<SheetName, string> = {
  workout: 'Log workout',
  meal: 'Log a meal',
  run: 'Log a run',
  weight: 'Update weight',
  swim: 'Log a swim',
};

function lastBefore(
  entries: LogEntry[],
  today: string,
  kind: LogEntry['data']['kind'],
): LogEntry | undefined {
  let best: LogEntry | undefined;
  for (const e of entries) {
    if (e.deleted || e.day >= today || e.data.kind !== kind) continue;
    if (!best || e.ts > best.ts) best = e;
  }
  return best;
}

export default function Board() {
  const { width } = useWindowDimensions();
  const settings = useSettings();
  const entries = useLogs((s) => s.entries);
  const coachPending = useOnboarding((s) => s.coachPending);
  const dismissCoach = useOnboarding((s) => s.dismissCoach);
  // Deep links can open a sheet directly (also handy for verification).
  const params = useLocalSearchParams<{ sheet?: string }>();
  const initialSheet =
    params.sheet && params.sheet in SHEET_TITLES ? (params.sheet as SheetName) : null;
  const [sheet, setSheet] = useState<SheetName | null>(initialSheet);

  const today = dayOf(Date.now());
  const board = useMemo(() => todayBoard(entries, today), [entries, today]);
  const streakN = useMemo(() => streak(intentionalDays(entries), today), [entries, today]);
  // Fresh = no history before today (day-1 board copy, low step counts).
  const fresh = useMemo(() => entries.every((e) => e.day === today), [entries, today]);
  const health = healthFor(fresh);

  const half = (width - 36 - 10) / 2;
  const full = width - 36;

  const steps = health.todaySteps();
  const stepsPct = Math.round((steps / settings.stepsGoalDay) * 100);
  const sleep = health.lastSleep();

  const lastWorkout = lastBefore(entries, today, 'workout');
  const lastRun = lastBefore(entries, today, 'run');
  const lastSwim = lastBefore(entries, today, 'swim');
  // Weight delta vs one week ago for the idle sub.
  const weekAgoWeight = useMemo(() => {
    const cutoff = prevDay(prevDay(prevDay(prevDay(prevDay(prevDay(prevDay(today)))))));
    let best: LogEntry | undefined;
    for (const e of entries) {
      if (e.deleted || e.data.kind !== 'weight' || e.day > cutoff) continue;
      if (!best || e.ts > best.ts) best = e;
    }
    return best?.data.kind === 'weight' ? best.data.kg : undefined;
  }, [entries, today]);

  const weightSub = board.weightLoggedToday
    ? 'updated just now'
    : board.weightKg === undefined
      ? 'tap + to set a baseline'
      : weekAgoWeight !== undefined
        ? `${board.weightKg <= weekAgoWeight ? '▾' : '▴'} ${Math.abs(board.weightKg - weekAgoWeight).toFixed(1)} this week`
        : 'baseline set';

  const progressBar = (pct: number, width_: number, h: number) => (
    <View
      style={{
        marginTop: 12,
        width: width_,
        height: h,
        borderRadius: h / 2,
        backgroundColor: 'rgba(255,255,255,.12)',
      }}
    >
      <View
        style={{
          width: `${Math.min(100, pct)}%`,
          height: '100%',
          borderRadius: h / 2,
          backgroundColor: colors.accent,
        }}
      />
    </View>
  );

  return (
    <View style={{ flex: 1, backgroundColor: colors.appBg }}>
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingTop: 64, paddingHorizontal: 18, gap: 14 }}
      >
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'flex-end',
            justifyContent: 'space-between',
          }}
        >
          <View>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <SlashMark size={20} color={colors.accent} />
              <Wordmark size={25} color={colors.white} />
            </View>
            <Txt
              size={12}
              w={600}
              ls={0.08}
              upper
              color={colors.mutedDark}
              style={{ marginTop: 6 }}
            >
              {formatDateLine(new Date())}
              {fresh ? ' · day 1' : ''}
            </Txt>
          </View>
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: 8,
              paddingBottom: 4,
            }}
          >
            <StreakChip streak={streakN} />
            <SyncPill />
          </View>
        </View>

        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
          {settings.picked.steps ? (
            <View
              style={{
                width: full,
                backgroundColor: colors.tile,
                borderRadius: 20,
                padding: 16,
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              <View>
                <Txt size={11} w={700} ls={0.06} upper color={colors.mutedDark}>
                  {settings.healthConnected ? 'Steps · auto' : 'Steps · phone only'}
                </Txt>
                <Txt size={38} w={900} ls={-0.03} lineHeight={1.1}>
                  {steps.toLocaleString('en-US')}
                </Txt>
              </View>
              <View style={{ alignItems: 'flex-end' }}>
                <Txt size={12} w={700} color={colors.accentOnDark}>
                  {stepsPct}% of {settings.stepsGoalDay.toLocaleString('en-US')}
                </Txt>
                {progressBar(stepsPct, 120, 7)}
              </View>
            </View>
          ) : null}

          {settings.picked.workouts ? (
            board.workout ? (
              <Tile
                width={half}
                label="Workout"
                title="Logged ✓"
                sub={
                  board.workout.mins > 0
                    ? `${board.workout.name} · ${board.workout.mins} min`
                    : board.workout.name
                }
                green
                footer={
                  <Txt size={11} w={800} ls={0.04} color={colors.ink} style={{ marginTop: 12 }}>
                    STREAK {streakN}
                  </Txt>
                }
              />
            ) : (
              <Tile
                width={half}
                label="Workout"
                title="—"
                sub={
                  fresh
                    ? 'nothing yet'
                    : lastWorkout?.data.kind === 'workout'
                      ? `last: ${shortWeekday(lastWorkout.day)} · ${lastWorkout.data.name}`
                      : 'nothing yet'
                }
                plus
                plusTinted
                border
                onPress={() => setSheet('workout')}
                footer={
                  <Txt
                    size={11}
                    w={800}
                    ls={0.04}
                    color={colors.accentOnDark}
                    style={{ marginTop: 12 }}
                  >
                    TAP TO START
                  </Txt>
                }
              />
            )
          ) : null}

          {settings.picked.meals ? (
            <Tile
              width={half}
              label="Meals"
              title={board.mealsKcal > 0 ? board.mealsKcal.toLocaleString('en-US') : '—'}
              sub={
                board.mealsKcal > 0
                  ? `of ${settings.kcalGoal.toLocaleString('en-US')} kcal`
                  : 'tap + to log a meal'
              }
              plus
              onPress={() => setSheet('meal')}
              footer={progressBar(
                Math.round((board.mealsKcal / settings.kcalGoal) * 100),
                half - 32,
                6,
              )}
            />
          ) : null}

          {settings.picked.running ? (
            <Tile
              width={half}
              label="Run"
              title={board.runKm !== undefined ? `${board.runKm} km` : '—'}
              sub={
                board.runKm !== undefined
                  ? 'logged today'
                  : fresh
                    ? 'nothing yet'
                    : lastRun?.data.kind === 'run'
                      ? `last: ${shortWeekday(lastRun.day)} · ${lastRun.data.km} km`
                      : 'nothing yet'
              }
              plus
              onPress={() => setSheet('run')}
            />
          ) : null}

          {settings.picked.weight ? (
            <Tile
              width={half}
              label="Weight"
              title={`${(board.weightKg ?? 72.4).toFixed(1)} kg`}
              sub={weightSub}
              subColor={board.weightLoggedToday ? colors.accentOnDark : colors.mutedDark}
              plus
              onPress={() => setSheet('weight')}
            />
          ) : null}

          {settings.picked.swimming ? (
            <Tile
              width={half}
              label="Swim"
              title={board.swimM !== undefined ? `${board.swimM.toLocaleString('en-US')} m` : '—'}
              sub={
                board.swimM !== undefined
                  ? 'logged today'
                  : fresh
                    ? 'nothing yet'
                    : lastSwim?.data.kind === 'swim'
                      ? `last: ${shortWeekday(lastSwim.day)} · ${lastSwim.data.m} m`
                      : 'nothing yet'
              }
              plus
              onPress={() => setSheet('swim')}
            />
          ) : null}

          {settings.picked.classes ? (
            <Tile
              width={half}
              label="Class"
              title={board.classDone ? 'Attended ✓' : fresh ? '—' : 'Yoga 18:30'}
              sub={
                board.classDone
                  ? 'logged today'
                  : fresh
                    ? 'tap + when you attend one'
                    : 'booked · tap + when done'
              }
              plus={!board.classDone}
              onPress={
                board.classDone
                  ? undefined
                  : () =>
                      logActivity({
                        tracker: 'classes',
                        source: 'manual',
                        data: { kind: 'class', name: fresh ? undefined : 'Yoga' },
                        title: 'Class logged',
                      })
              }
            />
          ) : null}

          {settings.picked.sleep ? (
            <View
              style={{
                width: full,
                backgroundColor: colors.tile,
                borderRadius: 20,
                padding: 16,
                opacity: 0.85,
                flexDirection: 'row',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}
            >
              <View>
                <Txt size={11} w={700} ls={0.06} upper color={colors.mutedDark}>
                  Sleep · auto
                </Txt>
                <Txt size={22} w={900} lineHeight={1.1} style={{ marginTop: 2 }}>
                  {sleep ? `${sleep.h}h ${sleep.m}m` : '—'}
                </Txt>
              </View>
              <Txt size={11.5} w={600} color={colors.mutedDark}>
                {settings.healthConnected ? 'from watch' : 'connect Health to auto-fill'}
              </Txt>
            </View>
          ) : null}
        </View>

        <Txt size={11} w={600} color={colors.mutedLight} center style={{ paddingBottom: 16 }}>
          Tap a tile to log · hold for details
        </Txt>
      </ScrollView>

      <LogSheet
        title={sheet ? SHEET_TITLES[sheet] : ''}
        visible={sheet !== null}
        onClose={() => setSheet(null)}
      >
        {sheet === 'workout' ? <WorkoutSheet fresh={fresh} onClose={() => setSheet(null)} /> : null}
        {sheet === 'meal' ? <MealSheet onClose={() => setSheet(null)} /> : null}
        {sheet === 'run' ? <RunSheet onClose={() => setSheet(null)} /> : null}
        {sheet === 'swim' ? <SwimSheet onClose={() => setSheet(null)} /> : null}
        {sheet === 'weight' ? (
          <WeightSheet initial={board.weightKg ?? 72.4} onClose={() => setSheet(null)} />
        ) : null}
      </LogSheet>

      {coachPending ? <CoachMark onDismiss={dismissCoach} /> : null}
      <Toast />
    </View>
  );
}
