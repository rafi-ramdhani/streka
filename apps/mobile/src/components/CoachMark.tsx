import { Pressable, View } from 'react-native';
import { colors } from '../theme';
import { Pressable98 } from './Pressable98';
import { Txt } from './Txt';

// One-time overlay after fresh onboarding (Proto:617-627).
export function CoachMark({ onDismiss }: { onDismiss: () => void }) {
  return (
    <Pressable
      onPress={onDismiss}
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0,0,0,.6)',
        alignItems: 'center',
        justifyContent: 'flex-end',
        paddingHorizontal: 30,
        paddingBottom: 150,
      }}
    >
      <View
        style={{
          backgroundColor: colors.accent,
          borderRadius: 18,
          paddingVertical: 16,
          paddingHorizontal: 18,
          width: '100%',
          shadowColor: '#000',
          shadowOpacity: 0.5,
          shadowRadius: 40,
          shadowOffset: { width: 0, height: 16 },
        }}
      >
        <Txt size={15} w={900} color={colors.ink}>
          Tap any tile's + to log it
        </Txt>
        <Txt size={12} w={600} color={colors.ink} style={{ marginTop: 3, opacity: 0.75 }}>
          Your first log today starts the streak. Day 1 is one tap away.
        </Txt>
        <Pressable98
          onPress={onDismiss}
          scaleTo={0.95}
          style={{
            marginTop: 12,
            alignSelf: 'flex-start',
            backgroundColor: colors.ink,
            borderRadius: 10,
            paddingVertical: 8,
            paddingHorizontal: 14,
          }}
        >
          <Txt size={12} w={800} color={colors.white}>
            GOT IT
          </Txt>
        </Pressable98>
      </View>
    </Pressable>
  );
}
