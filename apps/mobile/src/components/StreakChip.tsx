import { View } from 'react-native';
import { colors } from '../theme';
import { SlashMark } from './SlashMark';
import { Txt } from './Txt';

export function StreakChip({ streak }: { streak: number }) {
  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        backgroundColor: 'rgba(23,194,95,.15)',
        borderRadius: 999,
        paddingVertical: 5,
        paddingHorizontal: 11,
      }}
    >
      <SlashMark size={11} color={colors.accentOnDark} />
      <Txt size={12} w={800} color={colors.accentOnDark}>
        {streak}
      </Txt>
    </View>
  );
}
