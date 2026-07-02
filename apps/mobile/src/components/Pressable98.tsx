import { Pressable, type PressableProps, type StyleProp, type ViewStyle } from 'react-native';

// Pressable with the prototype's press feedback (scale ~.98 on active).
export function Pressable98({
  style,
  scaleTo = 0.98,
  ...rest
}: PressableProps & { style?: StyleProp<ViewStyle>; scaleTo?: number }) {
  return (
    <Pressable
      {...rest}
      style={({ pressed }) => [
        style,
        { transform: [{ scale: pressed ? scaleTo : 1 }] },
      ]}
    />
  );
}
