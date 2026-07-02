import { Text, View } from 'react-native';
import { colors, fonts } from '../../src/theme';

export default function Board() {
  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
      <Text style={{ color: colors.white, fontFamily: fonts.black, fontSize: 22 }}>Board</Text>
    </View>
  );
}
