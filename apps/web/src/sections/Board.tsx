import { useMemo, useState } from 'react';
import {
  addDays,
  intentionalDays,
  streak,
  todayBoard,
  weekDayCounts,
  weekStartOf,
  weeklyActiveDays,
} from '@streka/core';
import { colors } from '@streka/tokens';
import { useLogs, useSettings } from '../core';
import { formatDateLine, logFromWeb, todayStr, useIsMobile } from '../lib';
import { Card, Slash, TileLabel, WeekBars } from '../components/bits';
import { Modal, OptionRow } from '../components/Modal';

type ModalName = 'workout' | 'meal' | 'run' | 'swim' | 'weight' | null;

const MODAL_TITLES: Record<Exclude<ModalName, null>, string> = {
  workout: 'Log workout',
  meal: 'Log a meal',
  run: 'Log a run',
  swim: 'Log a swim',
  weight: 'Update weight',
};

const DAY_LABELS = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];

function Tile({
  label,
  title,
  sub,
  subColor = colors.mutedLight,
  onClick,
  greenBorder,
  bar,
  plusTinted,
}: {
  label: string;
  title: string;
  sub: string;
  subColor?: string;
  onClick?: () => void;
  greenBorder?: boolean;
  bar?: number;
  plusTinted?: boolean;
}) {
  return (
    <div
      className={onClick ? 'tile' : undefined}
      onClick={onClick}
      style={{
        background: '#fff',
        border: greenBorder ? '1px solid rgba(23,194,95,.5)' : '1px solid rgba(0,0,0,.06)',
        borderRadius: 20,
        padding: 18,
        position: 'relative',
      }}
    >
      {onClick ? (
        <div
          style={{
            position: 'absolute',
            top: 14,
            right: 14,
            width: 26,
            height: 26,
            borderRadius: '50%',
            background: plusTinted ? 'rgba(23,194,95,.15)' : '#f0f2ee',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontWeight: 800,
            fontSize: 15,
            color: colors.accentOnLight,
          }}
        >
          +
        </div>
      ) : null}
      <TileLabel>{label}</TileLabel>
      <div style={{ fontSize: 22, fontWeight: 900, marginTop: 4, lineHeight: 1.1 }}>{title}</div>
      <div style={{ fontSize: 12, fontWeight: 600, marginTop: 2, color: subColor }}>{sub}</div>
      {bar !== undefined ? (
        <div style={{ marginTop: 12, height: 6, borderRadius: 3, background: '#eef0ec' }}>
          <div
            style={{
              width: `${Math.min(100, bar)}%`,
              height: '100%',
              borderRadius: 3,
              background: colors.accent,
            }}
          />
        </div>
      ) : null}
    </div>
  );
}

export function Board({ goGoals }: { goGoals: () => void }) {
  const mobile = useIsMobile();
  const settings = useSettings();
  const entries = useLogs((s) => s.entries);
  const [modal, setModal] = useState<ModalName>(null);
  const [weightDraft, setWeightDraft] = useState(72.4);

  const today = todayStr();
  const weekStart = weekStartOf(today);
  const board = useMemo(() => todayBoard(entries, today), [entries, today]);
  const streakN = useMemo(() => streak(intentionalDays(entries), today), [entries, today]);
  const weekCounts = useMemo(() => weekDayCounts(entries, weekStart), [entries, weekStart]);
  const active = weeklyActiveDays(entries, weekStart);
  const goalCount = Math.min(settings.rhythmDays, active);

  const close = () => setModal(null);
  const openWeight = () => {
    setWeightDraft(board.weightKg ?? 72.4);
    setModal('weight');
  };

  const bars = weekCounts.map((count, i) => {
    const day = addDays(weekStart, i);
    return {
      h: count === 0 ? 10 : Math.min(58, 21 + count * 13),
      on: count > 0,
      label: DAY_LABELS[i]!,
      today: day === today,
    };
  });

  const workoutOptions = [
    { name: 'Upper body', meta: '~45 min' },
    { name: 'Lower body', meta: '~40 min' },
    { name: 'Full body 30', meta: '~30 min' },
  ];
  const mealOptions = [
    { label: 'Light meal / snack', kcal: 300 },
    { label: 'Regular meal', kcal: 550 },
    { label: 'Big meal', kcal: 800 },
  ];
  const runOptions = [
    { label: 'Quick 2K', meta: '2.0 km', km: 2.0 },
    { label: 'Easy 5K', meta: '5.0 km', km: 5.0 },
    { label: 'Same as last time', meta: '4.2 km', km: 4.2 },
  ];
  const swimOptions = [
    { label: 'Short swim', meta: '400 m', m: 400 },
    { label: 'Regular swim', meta: '800 m', m: 800 },
    { label: 'Long swim', meta: '1,200 m', m: 1200 },
  ];

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
        <div>
          <div
            style={{
              fontSize: 12,
              fontWeight: 700,
              letterSpacing: '.08em',
              textTransform: 'uppercase',
              color: colors.mutedLight,
            }}
          >
            {formatDateLine()}
          </div>
          <div
            style={{
              fontSize: 'clamp(28px,3.4vw,38px)',
              fontWeight: 900,
              letterSpacing: '-.02em',
              lineHeight: 1.05,
            }}
          >
            Today
          </div>
        </div>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 7,
            background: 'rgba(23,194,95,.13)',
            borderRadius: 999,
            padding: '7px 15px',
          }}
        >
          <Slash size={13} color={colors.accentOnLight} />
          <span style={{ fontSize: 14, fontWeight: 900, color: colors.accentOnLight }}>
            {streakN}-day streak
          </span>
        </div>
      </div>

      <div
        style={{
          background: colors.appBg,
          color: '#fff',
          borderRadius: 22,
          padding: '22px 24px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: 16,
        }}
      >
        <div>
          <TileLabel dark>Steps · auto from watch</TileLabel>
          <div
            style={{
              fontSize: 'clamp(38px,4.5vw,52px)',
              fontWeight: 900,
              letterSpacing: '-.03em',
              lineHeight: 1.05,
            }}
          >
            8,246
          </div>
        </div>
        <div style={{ minWidth: 200, flex: '0 1 300px' }}>
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              fontSize: 12,
              fontWeight: 700,
              color: colors.accentOnDark,
              marginBottom: 8,
            }}
          >
            <span>72%</span>
            <span style={{ color: colors.mutedDark }}>goal 11,500</span>
          </div>
          <div style={{ height: 8, borderRadius: 4, background: 'rgba(255,255,255,.14)' }}>
            <div
              style={{
                width: '72%',
                height: '100%',
                borderRadius: 4,
                background: colors.accent,
              }}
            />
          </div>
        </div>
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: mobile ? '1fr 1fr' : 'repeat(4, 1fr)',
          gap: 12,
        }}
      >
        {board.workout ? (
          <div
            style={{
              background: colors.accent,
              borderRadius: 20,
              padding: 18,
              color: colors.ink,
            }}
          >
            <div
              style={{
                fontSize: 11,
                fontWeight: 700,
                letterSpacing: '.06em',
                textTransform: 'uppercase',
                opacity: 0.65,
              }}
            >
              Workout
            </div>
            <div style={{ fontSize: 22, fontWeight: 900, marginTop: 4, lineHeight: 1.1 }}>
              Logged ✓
            </div>
            <div style={{ fontSize: 12, fontWeight: 600, marginTop: 2, opacity: 0.7 }}>
              {board.workout.name}
            </div>
          </div>
        ) : (
          <Tile
            label="Workout"
            title="—"
            sub="last: Tue · Upper body"
            onClick={() => setModal('workout')}
            greenBorder
            plusTinted
          />
        )}

        <Tile
          label="Meals"
          title={board.mealsKcal > 0 ? board.mealsKcal.toLocaleString('en-US') : '—'}
          sub={`of ${settings.kcalGoal.toLocaleString('en-US')} kcal`}
          onClick={() => setModal('meal')}
          bar={Math.round((board.mealsKcal / settings.kcalGoal) * 100)}
        />

        <Tile
          label="Run"
          title={board.runKm !== undefined ? `${board.runKm} km` : '—'}
          sub={board.runKm !== undefined ? 'this morning · from phone' : 'last: Tue · 4.2 km'}
          onClick={() => setModal('run')}
        />

        <Tile
          label="Weight"
          title={`${(board.weightKg ?? 72.4).toFixed(1)} kg`}
          sub={board.weightLoggedToday ? 'updated just now' : '▾ 0.3 this week'}
          subColor={board.weightLoggedToday ? colors.accentOnLight : colors.mutedLight}
          onClick={openWeight}
        />

        <Tile
          label="Swim"
          title={board.swimM !== undefined ? `${board.swimM.toLocaleString('en-US')} m` : '—'}
          sub={board.swimM !== undefined ? 'logged today' : 'last: Mon · 800 m'}
          onClick={() => setModal('swim')}
        />

        <Tile
          label="Class"
          title={board.classDone ? 'Attended ✓' : 'Yoga 18:30'}
          sub={board.classDone ? 'Yoga · 18:30' : 'booked · click + when done'}
          onClick={
            board.classDone
              ? undefined
              : () =>
                  logFromWeb({
                    tracker: 'classes',
                    source: 'manual',
                    data: { kind: 'class', name: 'Yoga' },
                    title: 'Class logged — Yoga',
                  })
          }
        />

        <div
          style={{
            background: '#fff',
            border: '1px solid rgba(0,0,0,.06)',
            borderRadius: 20,
            padding: 18,
            opacity: 0.9,
          }}
        >
          <TileLabel>Sleep · auto</TileLabel>
          <div style={{ fontSize: 22, fontWeight: 900, marginTop: 4, lineHeight: 1.1 }}>7h 20m</div>
          <div style={{ fontSize: 12, fontWeight: 600, marginTop: 2, color: colors.mutedLight }}>
            from watch
          </div>
        </div>
      </div>

      <div
        style={{ display: 'grid', gridTemplateColumns: mobile ? '1fr' : '1fr 1fr', gap: 12 }}
      >
        <Card style={{ padding: 20 }}>
          <div
            style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}
          >
            <TileLabel>This week</TileLabel>
            <div style={{ fontSize: 12, fontWeight: 800, color: colors.accentOnLight }}>
              {active} of 7 active
            </div>
          </div>
          <WeekBars bars={bars} />
        </Card>
        <Card
          style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 12 }}
        >
          <div
            style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
          >
            <div style={{ fontSize: 15, fontWeight: 900 }}>
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
          <div style={{ fontSize: 12, fontWeight: 600, color: colors.mutedLight }}>
            One more active day hits this week's rhythm — and any log today keeps the daily streak
            alive.
          </div>
          <div
            onClick={goGoals}
            style={{
              fontSize: 12.5,
              fontWeight: 800,
              color: colors.accentOnLight,
              cursor: 'pointer',
            }}
          >
            All goals →
          </div>
        </Card>
      </div>

      <div
        style={{
          textAlign: 'center',
          fontSize: 11.5,
          fontWeight: 600,
          color: '#9aa199',
          padding: '6px 0 20px',
        }}
      >
        Live workout sessions with a timer run on the phone app — the web board is for quick logs
        and review.
      </div>

      {modal ? (
        <Modal title={MODAL_TITLES[modal]} onClose={close}>
          {modal === 'workout' ? (
            <>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {workoutOptions.map((t) => (
                  <OptionRow
                    key={t.name}
                    label={t.name}
                    meta={t.meta}
                    metaColor={colors.mutedLight}
                    onClick={() => {
                      close();
                      logFromWeb({
                        tracker: 'workouts',
                        source: 'manual',
                        data: { kind: 'workout', name: `${t.name} · logged on web`, mins: 0 },
                        title: `Workout logged — ${t.name}`,
                      });
                    }}
                  />
                ))}
              </div>
              <div
                style={{
                  fontSize: 11.5,
                  fontWeight: 600,
                  color: '#9aa199',
                  textAlign: 'center',
                }}
              >
                Live sessions with a timer run on the phone app
              </div>
            </>
          ) : null}
          {modal === 'meal'
            ? mealOptions.map((m) => (
                <OptionRow
                  key={m.kcal}
                  label={m.label}
                  meta={`${m.kcal} kcal`}
                  onClick={() => {
                    close();
                    logFromWeb({
                      tracker: 'meals',
                      source: 'manual',
                      data: { kind: 'meal', kcal: m.kcal, label: m.label },
                      title: `Meal logged · ${m.kcal} kcal`,
                    });
                  }}
                />
              ))
            : null}
          {modal === 'run'
            ? runOptions.map((r) => (
                <OptionRow
                  key={r.label}
                  label={r.label}
                  meta={r.meta}
                  onClick={() => {
                    close();
                    logFromWeb({
                      tracker: 'running',
                      source: 'manual',
                      data: { kind: 'run', km: r.km },
                      title: `Run logged · ${r.km.toFixed(1)} km`,
                    });
                  }}
                />
              ))
            : null}
          {modal === 'swim'
            ? swimOptions.map((w) => (
                <OptionRow
                  key={w.m}
                  label={w.label}
                  meta={w.meta}
                  onClick={() => {
                    close();
                    logFromWeb({
                      tracker: 'swimming',
                      source: 'manual',
                      data: { kind: 'swim', m: w.m },
                      title: `Swim logged · ${w.m.toLocaleString('en-US')} m`,
                    });
                  }}
                />
              ))
            : null}
          {modal === 'weight' ? (
            <>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 22,
                  padding: '6px 0',
                }}
              >
                <div
                  className="pressable"
                  onClick={() => setWeightDraft((v) => Math.round((v - 0.1) * 10) / 10)}
                  style={{
                    width: 50,
                    height: 50,
                    borderRadius: '50%',
                    background: '#f0f2ee',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: 24,
                    fontWeight: 800,
                  }}
                >
                  −
                </div>
                <div style={{ textAlign: 'center', minWidth: 120 }}>
                  <div
                    style={{
                      fontSize: 42,
                      fontWeight: 900,
                      letterSpacing: '-.03em',
                      fontVariantNumeric: 'tabular-nums',
                    }}
                  >
                    {weightDraft.toFixed(1)}
                  </div>
                  <div style={{ fontSize: 12, fontWeight: 700, color: colors.mutedLight }}>kg</div>
                </div>
                <div
                  className="pressable"
                  onClick={() => setWeightDraft((v) => Math.round((v + 0.1) * 10) / 10)}
                  style={{
                    width: 50,
                    height: 50,
                    borderRadius: '50%',
                    background: '#f0f2ee',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: 24,
                    fontWeight: 800,
                  }}
                >
                  +
                </div>
              </div>
              <div
                className="pressable"
                onClick={() => {
                  close();
                  logFromWeb({
                    tracker: 'weight',
                    source: 'manual',
                    data: { kind: 'weight', kg: weightDraft },
                    title: `Weight updated · ${weightDraft.toFixed(1)} kg`,
                  });
                }}
                style={{
                  textAlign: 'center',
                  padding: 14,
                  borderRadius: 14,
                  background: colors.accent,
                  color: colors.ink,
                  fontSize: 14,
                  fontWeight: 900,
                  letterSpacing: '.02em',
                }}
              >
                SAVE WEIGHT
              </div>
            </>
          ) : null}
        </Modal>
      ) : null}
    </div>
  );
}
