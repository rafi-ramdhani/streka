import { router } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';
import { formatDistance, kmToMi, miToKm } from '@streka/core';
import { logActivity, useSettings } from '../core';
import { colors } from '../theme';
import { BigButton } from '../components/BigButton';
import { Pressable98 } from '../components/Pressable98';
import { Txt } from '../components/Txt';
import { SheetRow } from './SheetRow';
import { SheetInput } from './SheetInput';

const OPTIONS = [
  { label: 'Quick 2K', km: 2.0 },
  { label: 'Easy 5K', km: 5.0 },
  { label: 'Same as last time', km: 4.2 },
];

function parseTime(t: string): number | null {
  const m = /^\s*(\d+):([0-5]?\d)\s*$/.exec(t);
  if (!m) return null;
  return Number(m[1]) * 60 + Number(m[2]);
}

function fmtSec(sec: number): string {
  return `${Math.floor(sec / 60)}:${String(Math.round(sec % 60)).padStart(2, '0')}`;
}

// Proto:670-684. GPS run is the primary action; below it are quick presets and
// a custom log where distance and an optional time derive the pace.
export function RunSheet({ onClose }: { onClose: () => void }) {
  const units = useSettings((s) => s.units);
  const imperial = units === 'imperial';
  const distUnit = imperial ? 'mi' : 'km';
  const [dist, setDist] = useState('');
  const [time, setTime] = useState('');

  const distVal = parseFloat(dist);
  const distOk = Number.isFinite(distVal) && distVal > 0;
  const sec = time.trim() ? parseTime(time) : null;
  const timeOk = time.trim() === '' || sec !== null;
  // Pace is time over the distance in the unit the user typed, so the shown
  // pace matches the min/km or min/mi label.
  const pace = distOk && sec !== null && sec > 0 ? fmtSec(sec / distVal) : null;

  const logCustom = () => {
    if (!distOk || !timeOk) return;
    const km = imperial ? miToKm(distVal) : Math.round(distVal * 100) / 100;
    onClose();
    logActivity({
      tracker: 'running',
      source: 'manual',
      data: {
        kind: 'run',
        km,
        ...(sec !== null ? { time: fmtSec(sec) } : {}),
        ...(pace ? { pace } : {}),
      },
      title: `Run logged · ${formatDistance(km, units)}`,
    });
  };

  return (
    <>
      <View style={{ gap: 8 }}>
        <Pressable98
          onPress={() => {
            onClose();
            router.push('/run');
          }}
          style={{
            backgroundColor: colors.accent,
            borderRadius: 16,
            paddingVertical: 15,
            paddingHorizontal: 16,
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <Txt size={15} w={900} color={colors.ink}>
            Start GPS run
          </Txt>
          <Txt size={12} w={800} color={colors.ink} style={{ opacity: 0.7 }}>
            live tracking
          </Txt>
        </Pressable98>
        {OPTIONS.map((o) => (
          <SheetRow
            key={o.label}
            label={o.label}
            meta={formatDistance(o.km, units)}
            onPress={() => {
              onClose();
              logActivity({
                tracker: 'running',
                source: 'manual',
                data: { kind: 'run', km: o.km },
                title: `Run logged · ${formatDistance(o.km, units)}`,
              });
            }}
          />
        ))}
      </View>

      <View style={{ gap: 10 }}>
        <Txt size={11} w={700} ls={0.06} upper color={colors.mutedDark}>
          Custom run
        </Txt>
        <View style={{ flexDirection: 'row', gap: 10 }}>
          <SheetInput
            label="Distance"
            value={dist}
            onChangeText={setDist}
            placeholder="4.2"
            keyboardType="decimal-pad"
            suffix={distUnit}
          />
          <SheetInput
            label="Time (optional)"
            value={time}
            onChangeText={setTime}
            placeholder="23:14"
            keyboardType="default"
          />
        </View>
        <Txt size={11.5} w={700} color={pace ? colors.accentOnDark : colors.mutedDark}>
          {!timeOk
            ? 'Time reads mm:ss, e.g. 23:14'
            : pace
              ? `pace ${pace} / ${distUnit}`
              : 'Add a time for pace, or just log the distance'}
        </Txt>
        <BigButton label="LOG RUN" pad={14} onPress={logCustom} disabled={!distOk || !timeOk} />
      </View>
    </>
  );
}
