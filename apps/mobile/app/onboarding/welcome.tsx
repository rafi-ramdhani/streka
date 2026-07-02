import { Text, View } from 'react-native';
import { colors, fonts } from '../../src/theme';

export default function Welcome() {
  return (
    <View
      style={{
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: colors.accent,
      }}
    >
      <Text style={{ color: colors.ink, fontFamily: fonts.black, fontSize: 22 }}>Welcome</Text>
    </View>
  );
}
