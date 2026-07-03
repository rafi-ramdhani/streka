import { useState } from 'react';
import { View } from 'react-native';
import { logActivity } from '../core';
import { BigButton } from '../components/BigButton';
import { Pressable98 } from '../components/Pressable98';
import { Txt } from '../components/Txt';
import { colors } from '../theme';
import { SheetInput } from './SheetInput';

// Common studio classes; tapping one logs it straight away. Anything else goes
// in the custom field. The kind of class is stored on the entry (ClassData.name).
const COMMON = ['Yoga', 'Spin', 'HIIT', 'Pilates', 'Boxing', 'Strength', 'Dance', 'Barre'];

export function ClassSheet({ onClose }: { onClose: () => void }) {
  const [name, setName] = useState('');

  const log = (className?: string) => {
    const trimmed = className?.trim();
    onClose();
    logActivity({
      tracker: 'classes',
      source: 'manual',
      data: { kind: 'class', ...(trimmed ? { name: trimmed } : {}) },
      title: trimmed ? `${trimmed} class logged` : 'Class logged',
    });
  };

  const typed = name.trim();

  return (
    <>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
        {COMMON.map((c) => (
          <Pressable98
            key={c}
            onPress={() => log(c)}
            style={{
              backgroundColor: colors.appBg,
              borderWidth: 1,
              borderColor: 'rgba(255,255,255,.1)',
              borderRadius: 999,
              paddingVertical: 10,
              paddingHorizontal: 15,
            }}
          >
            <Txt size={13.5} w={800}>
              {c}
            </Txt>
          </Pressable98>
        ))}
      </View>

      <View style={{ gap: 10 }}>
        <SheetInput
          label="Another kind"
          value={name}
          onChangeText={setName}
          placeholder="e.g. Muay Thai"
          keyboardType="default"
        />
        <BigButton
          label={typed ? `LOG ${typed.toUpperCase()}` : 'LOG A CLASS'}
          pad={14}
          onPress={() => log(typed || undefined)}
        />
      </View>
    </>
  );
}
