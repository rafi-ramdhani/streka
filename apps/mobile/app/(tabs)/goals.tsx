import { Text, View } from 'react-native';
import { colors, fonts } from '../../src/theme';

export default function Goals() {
  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
      <Text style={{ color: colors.white, fontFamily: fonts.black, fontSize: 22 }}>Goals</Text>
    </View>
  );
}
