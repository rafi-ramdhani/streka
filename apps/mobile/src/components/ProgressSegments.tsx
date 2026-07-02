import { View } from 'react-native';
import { colors } from '../theme';

// Row of equal segments, first `filled` in green (onboarding bar, goals card).
export function ProgressSegments({
  total,
  filled,
  height = 4,
  offColor = 'rgba(255,255,255,.15)',
}: {
  total: number;
  filled: number;
  height?: number;
  offColor?: string;
}) {
  return (
    <View style={{ flexDirection: 'row', gap: 5 }}>
      {Array.from({ length: total }, (_, i) => (
        <View
          key={i}
          style={{
            flex: 1,
            height,
            borderRadius: height / 2,
            backgroundColor: i < filled ? colors.accent : offColor,
          }}
        />
      ))}
    </View>
  );
}
