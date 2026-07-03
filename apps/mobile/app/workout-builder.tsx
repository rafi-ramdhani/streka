import { useState } from 'react';
import { ScrollView, View } from 'react-native';
import { showToast } from '../src/core';
import { BigButton } from '../src/components/BigButton';
import { Pressable98 } from '../src/components/Pressable98';
import { SubHeader } from '../src/components/SubHeader';
import { Txt } from '../src/components/Txt';
import { SheetInput } from '../src/sheets/SheetInput';
import { useCustomWorkouts } from '../src/stores/customWorkouts';
import { goBack } from '../src/lib/nav';
import { useScreenPad } from '../src/lib/screenPad';
import { colors } from '../src/theme';

// Build a reusable custom workout: a name and an ordered exercise list. It
// then shows up in the workout sheet and starts a live session like any
// template. Undesigned screen, following the app's sheet input language.
export default function WorkoutBuilder() {
  const pad = useScreenPad();
  const add = useCustomWorkouts((s) => s.add);
  const [name, setName] = useState('');
  const [exercises, setExercises] = useState<string[]>(['']);

  const setEx = (i: number, v: string) =>
    setExercises((xs) => xs.map((x, xi) => (xi === i ? v : x)));
  const addRow = () => setExercises((xs) => [...xs, '']);
  const removeRow = (i: number) => setExercises((xs) => xs.filter((_, xi) => xi !== i));

  const cleanName = name.trim();
  const cleanExercises = exercises.map((e) => e.trim()).filter(Boolean);
  const canSave = cleanName.length > 0 && cleanExercises.length > 0;

  const save = () => {
    if (!canSave) return;
    add(cleanName, cleanExercises);
    showToast('Workout saved', `${cleanName} · ${cleanExercises.length} exercises`);
    goBack();
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.appBg, paddingTop: pad.top }}>
      <ScrollView
        contentContainerStyle={{ paddingHorizontal: 20, gap: 16, paddingBottom: 30 }}
        keyboardShouldPersistTaps="handled"
      >
        <SubHeader title="New workout" />

        <SheetInput
          label="Workout name"
          value={name}
          onChangeText={setName}
          placeholder="e.g. Push day"
          keyboardType="default"
        />

        <View style={{ gap: 10 }}>
          <Txt size={11} w={700} ls={0.06} upper color={colors.mutedDark}>
            Exercises
          </Txt>
          {exercises.map((ex, i) => (
            <View key={i} style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 10 }}>
              <SheetInput
                label={`Exercise ${i + 1}`}
                value={ex}
                onChangeText={(v) => setEx(i, v)}
                placeholder="e.g. Bench press"
                keyboardType="default"
              />
              {exercises.length > 1 ? (
                <Pressable98
                  onPress={() => removeRow(i)}
                  hitSlop={8}
                  style={{
                    width: 52,
                    height: 52,
                    borderRadius: 14,
                    backgroundColor: 'rgba(255,255,255,.06)',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Txt size={22} w={800} color={colors.mutedDark}>
                    ×
                  </Txt>
                </Pressable98>
              ) : null}
            </View>
          ))}
          <Pressable98
            onPress={addRow}
            style={{
              borderWidth: 1.5,
              borderStyle: 'dashed',
              borderColor: 'rgba(255,255,255,.25)',
              borderRadius: 14,
              padding: 13,
              alignItems: 'center',
            }}
          >
            <Txt size={13} w={800} color={colors.mutedDark}>
              + Add exercise
            </Txt>
          </Pressable98>
        </View>

        <Txt size={11.5} w={600} color={colors.mutedDark} lineHeight={1.45}>
          Each exercise starts at three work sets. As you log, the targets fill in with
          your last top set, just like the built-in workouts.
        </Txt>

        <BigButton label="SAVE WORKOUT" onPress={save} disabled={!canSave} />
      </ScrollView>
    </View>
  );
}
