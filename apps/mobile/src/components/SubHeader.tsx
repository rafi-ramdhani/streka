import { router } from 'expo-router';
import { View } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { colors } from '../theme';
import { Pressable98 } from './Pressable98';
import { Txt } from './Txt';

// Back chevron + title header used by Settings sub-screens (same pattern as
// the run detail header from canvas 10a).
export function SubHeader({ title }: { title: string }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
      <Pressable98 onPress={() => router.back()} hitSlop={12} scaleTo={0.9}>
        <Svg width={9} height={16} viewBox="0 0 9 16">
          <Path
            d="M8 1L1 8l7 7"
            stroke={colors.mutedDark}
            strokeWidth={2.5}
            fill="none"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </Svg>
      </Pressable98>
      <Txt size={16} w={900}>
        {title}
      </Txt>
    </View>
  );
}
