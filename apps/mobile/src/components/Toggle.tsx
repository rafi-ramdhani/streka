import { Pressable, View } from 'react-native';
import { colors } from '../theme';

// 40x24 pill toggle from the prototype (green on, white/gray knob).
export function Toggle({ on, onToggle }: { on: boolean; onToggle: () => void }) {
  return (
    <Pressable onPress={onToggle} hitSlop={12}>
      <View
        style={{
          width: 40,
          height: 24,
          borderRadius: 12,
          backgroundColor: on ? colors.accent : 'rgba(255,255,255,.15)',
          justifyContent: 'center',
        }}
      >
        <View
          style={{
            position: 'absolute',
            top: 2,
            left: on ? undefined : 2,
            right: on ? 2 : undefined,
            width: 20,
            height: 20,
            borderRadius: 10,
            backgroundColor: on ? colors.white : colors.mutedDark,
          }}
        />
      </View>
    </Pressable>
  );
}
