import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { ScrollView, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { colors } from '../src/theme';
import { Pressable98 } from '../src/components/Pressable98';
import { Txt } from '../src/components/Txt';
import { useSession } from '../src/stores/session';

function fmtElapsed(startTs: number): string {
  const el = Math.max(0, Math.floor((Date.now() - startTs) / 1000));
  return `${Math.floor(el / 60)}:${String(el % 60).padStart(2, '0')}`;
}

// Live workout session (Proto:167-206): big timer, tappable set rows with the
// next undone row flagged TAP WHEN DONE, saved set-by-set in the store.
export default function Session() {
  const session = useSession();
  const [, setTick] = useState(0);

  useEffect(() => {
    const t = setInterval(() => setTick((n) => n + 1), 1000);
    return () => clearInterval(t);
  }, []);

  const firstUndone = session.sets.findIndex((s) => !s.done);

  return (
    <View style={{ flex: 1, backgroundColor: colors.appBg, paddingTop: 64 }}>
      <ScrollView contentContainerStyle={{ paddingHorizontal: 20, gap: 16 }}>
        <View
          style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}
        >
          <Txt size={12} w={700} ls={0.06} upper color={colors.mutedDark}>
            {session.name}
          </Txt>
          <Txt size={12} w={700} color={colors.mutedDark}>
            1 of 6 exercises
          </Txt>
        </View>

        <View style={{ alignItems: 'center', paddingTop: 6, paddingBottom: 2 }}>
          <Txt size={64} w={900} ls={-0.03} tabular lineHeight={1}>
            {session.active ? fmtElapsed(session.startTs) : '0:00'}
          </Txt>
          <View
            style={{
              marginTop: 8,
              flexDirection: 'row',
              alignItems: 'center',
              gap: 6,
              backgroundColor: 'rgba(23,194,95,.15)',
              borderRadius: 999,
              paddingVertical: 5,
              paddingHorizontal: 12,
            }}
          >
            <Txt size={12} w={800} color={colors.accentOnDark}>
              SESSION LIVE · SAVED SET-BY-SET
            </Txt>
          </View>
        </View>

        <View style={{ backgroundColor: colors.tile, borderRadius: 22, padding: 18, gap: 12 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' }}>
            <Txt size={20} w={900}>
              Bench press
            </Txt>
            <Txt size={12} w={700} color={colors.mutedDark}>
              last: 60 kg × 8
            </Txt>
          </View>
          <View style={{ gap: 8 }}>
            {session.sets.map((s, i) => {
              const isNext = !s.done && i === firstUndone;
              return (
                <Pressable98
                  key={i}
                  onPress={() => session.toggleSet(i)}
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 12,
                    backgroundColor: s.done ? 'rgba(23,194,95,.1)' : 'rgba(255,255,255,.06)',
                    borderWidth: 1,
                    borderColor: s.done ? 'transparent' : 'rgba(255,255,255,.12)',
                    borderRadius: 14,
                    paddingVertical: 11,
                    paddingHorizontal: 14,
                    minHeight: 44,
                  }}
                >
                  <View
                    style={{
                      width: 24,
                      height: 24,
                      borderRadius: 12,
                      backgroundColor: s.done ? colors.accent : 'transparent',
                      borderWidth: s.done ? 0 : 2,
                      borderColor: 'rgba(255,255,255,.3)',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    {s.done ? (
                      <Svg width={11} height={9} viewBox="0 0 11 9">
                        <Path
                          d="M1 4.5l3 3L10 1"
                          stroke={colors.ink}
                          strokeWidth={2.2}
                          fill="none"
                          strokeLinecap="round"
                        />
                      </Svg>
                    ) : null}
                  </View>
                  <Txt size={15} w={800} style={{ flex: 1 }}>
                    {s.label}
                  </Txt>
                  <Txt size={11} w={800} color={isNext ? colors.accentOnDark : colors.mutedDark}>
                    {isNext ? 'TAP WHEN DONE' : `SET ${i + 1}`}
                  </Txt>
                </Pressable98>
              );
            })}
          </View>
          <Pressable98
            onPress={session.addSet}
            style={{
              borderWidth: 1.5,
              borderStyle: 'dashed',
              borderColor: 'rgba(255,255,255,.2)',
              borderRadius: 12,
              padding: 10,
              alignItems: 'center',
            }}
          >
            <Txt size={12.5} w={800} color={colors.mutedDark}>
              + Add set
            </Txt>
          </Pressable98>
        </View>

        <View
          style={{
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'center',
            backgroundColor: colors.tile,
            borderRadius: 16,
            paddingVertical: 13,
            paddingHorizontal: 16,
            opacity: 0.7,
          }}
        >
          <Txt size={13.5} w={800} color={colors.mutedDark}>
            Next: Incline dumbbell press
          </Txt>
          <Svg width={8} height={14} viewBox="0 0 8 14">
            <Path
              d="M1 1l6 6-6 6"
              stroke={colors.mutedDark}
              strokeWidth={2}
              fill="none"
              strokeLinecap="round"
            />
          </Svg>
        </View>
      </ScrollView>

      <View
        style={{
          flexDirection: 'row',
          gap: 10,
          paddingTop: 12,
          paddingHorizontal: 20,
          paddingBottom: 40,
        }}
      >
        <Pressable98
          onPress={() => {
            session.discard();
            router.back();
          }}
          scaleTo={0.97}
          style={{
            paddingVertical: 15,
            paddingHorizontal: 18,
            borderRadius: 16,
            backgroundColor: 'rgba(255,255,255,.08)',
          }}
        >
          <Txt size={14} w={800} color={colors.mutedDark}>
            Discard
          </Txt>
        </Pressable98>
        <Pressable98
          onPress={() => {
            session.finish();
            router.back();
          }}
          scaleTo={0.97}
          style={{
            flex: 1,
            alignItems: 'center',
            paddingVertical: 15,
            borderRadius: 16,
            backgroundColor: colors.accent,
          }}
        >
          <Txt size={14} w={900} ls={0.02} color={colors.ink}>
            FINISH WORKOUT
          </Txt>
        </Pressable98>
      </View>
    </View>
  );
}
