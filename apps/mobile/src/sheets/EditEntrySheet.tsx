import { useState } from 'react';
import { View } from 'react-native';
import {
  kgToLb,
  kmToMi,
  lbToKg,
  miToKm,
  toastSub,
  type LogData,
  type LogEntry,
  type Units,
} from '@streka/core';
import { showToast, useLogs, useSettings, useSync } from '../core';
import { colors } from '../theme';
import { BigButton } from '../components/BigButton';
import { LogSheet } from '../components/LogSheet';
import { Pressable98 } from '../components/Pressable98';
import { Txt } from '../components/Txt';

// One editor for every numeric entry kind: the same circle stepper the log
// sheets use, saving through the store's edit-in-place (id, ts and day stay
// fixed; only the value changes). Drafts step in the display unit; the
// entry always stores metric.

interface FieldSpec {
  title: string;
  unit: string;
  step: number;
  min: number;
  decimals: 0 | 1 | 2;
  initial: (data: LogData, imperial: boolean) => number;
  apply: (data: LogData, value: number, imperial: boolean) => LogData;
}

function fmtSec(sec: number): string {
  return `${Math.floor(sec / 60)}:${String(Math.floor(sec % 60)).padStart(2, '0')}`;
}

function parseMmSs(t: string): number | null {
  const m = /^(\d+):(\d\d)$/.exec(t);
  return m ? Number(m[1]) * 60 + Number(m[2]) : null;
}

const FIELDS: Partial<Record<LogData['kind'], FieldSpec>> = {
  meal: {
    title: 'Edit meal',
    unit: 'kcal',
    step: 25,
    min: 0,
    decimals: 0,
    initial: (d) => (d.kind === 'meal' ? d.kcal : 0),
    apply: (d, v) => (d.kind === 'meal' ? { ...d, kcal: v } : d),
  },
  weight: {
    title: 'Edit weight',
    unit: '',
    step: 0.1,
    min: 20,
    decimals: 1,
    initial: (d, imp) => (d.kind === 'weight' ? (imp ? kgToLb(d.kg) : d.kg) : 0),
    apply: (d, v, imp) => (d.kind === 'weight' ? { ...d, kg: imp ? lbToKg(v) : v } : d),
  },
  swim: {
    title: 'Edit swim',
    unit: 'm',
    step: 50,
    min: 50,
    decimals: 0,
    initial: (d) => (d.kind === 'swim' ? d.m : 0),
    apply: (d, v) => (d.kind === 'swim' ? { ...d, m: v } : d),
  },
  run: {
    title: 'Edit run',
    unit: '',
    step: 0.1,
    min: 0.1,
    decimals: 2,
    initial: (d, imp) => (d.kind === 'run' ? (imp ? kmToMi(d.km) : d.km) : 0),
    apply: (d, v, imp) => {
      if (d.kind !== 'run') return d;
      const km = imp ? miToKm(v) : Math.round(v * 100) / 100;
      // Pace derives from time over distance; keep it consistent.
      const sec = d.time ? parseMmSs(d.time) : null;
      const pace = sec !== null && km > 0 ? fmtSec(sec / km) : d.pace;
      return { ...d, km, ...(pace !== undefined ? { pace } : {}) };
    },
  },
  workout: {
    title: 'Edit workout',
    unit: 'min',
    step: 5,
    min: 5,
    decimals: 0,
    initial: (d) => (d.kind === 'workout' ? d.mins : 0),
    apply: (d, v) => (d.kind === 'workout' ? { ...d, mins: v } : d),
  },
};

export function editableKind(kind: LogData['kind']): boolean {
  return kind in FIELDS;
}

export function EditEntrySheet({
  entry,
  units,
  onClose,
}: {
  entry: LogEntry;
  units: Units;
  onClose: () => void;
}) {
  const imperial = units === 'imperial';
  const spec = FIELDS[entry.data.kind];
  const update = useLogs((s) => s.update);
  const account = useSettings((s) => s.hasAccount);
  const online = useSync((s) => s.online);
  const [draft, setDraft] = useState(() => (spec ? spec.initial(entry.data, imperial) : 0));
  if (!spec) return null;

  const unit =
    spec.unit ||
    (entry.data.kind === 'weight' ? (imperial ? 'lb' : 'kg') : imperial ? 'mi' : 'km');
  const scale = 10 ** spec.decimals;
  const step = (d: number) =>
    setDraft((v) => Math.max(spec.min, Math.round((v + d) * scale) / scale));

  const circle = (label: string, onPress: () => void) => (
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

  return (
    <LogSheet title={spec.title} visible onClose={onClose}>
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 22,
          paddingVertical: 8,
        }}
      >
        {circle('−', () => step(-spec.step))}
        <View style={{ alignItems: 'center', minWidth: 130 }}>
          <Txt size={46} w={900} ls={-0.03} tabular>
            {draft.toFixed(spec.decimals)}
          </Txt>
          <Txt size={12} w={700} color={colors.mutedDark}>
            {unit}
          </Txt>
        </View>
        {circle('+', () => step(spec.step))}
      </View>
      <BigButton
        label="SAVE CHANGES"
        onPress={() => {
          update(entry.id, spec.apply(entry.data, draft, imperial));
          showToast('Updated ✓', toastSub({ account, online, firstLog: false, streakN: 0 }));
          onClose();
        }}
      />
    </LogSheet>
  );
}
