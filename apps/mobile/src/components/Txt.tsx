import { Text, type StyleProp, type TextStyle } from 'react-native';
import type { ReactNode } from 'react';
import { colors } from '../theme';

const FAMILIES = {
  400: 'Archivo_400Regular',
  500: 'Archivo_500Medium',
  600: 'Archivo_600SemiBold',
  700: 'Archivo_700Bold',
  800: 'Archivo_800ExtraBold',
  900: 'Archivo_900Black',
} as const;

export interface TxtProps {
  children: ReactNode;
  size: number;
  w?: keyof typeof FAMILIES;
  color?: string;
  ls?: number; // letter-spacing in em, converted to points
  italic?: boolean;
  tabular?: boolean;
  center?: boolean;
  upper?: boolean;
  lineHeight?: number; // multiplier
  style?: StyleProp<TextStyle>;
}

// Single text primitive: maps CSS-style weights from the prototype onto the
// registered Archivo families (RN needs explicit family names per weight).
export function Txt({
  children,
  size,
  w = 600,
  color = colors.white,
  ls,
  italic,
  tabular,
  center,
  upper,
  lineHeight,
  style,
}: TxtProps) {
  return (
    <Text
      style={[
        {
          fontSize: size,
          fontFamily: italic && w === 900 ? 'Archivo_900Black_Italic' : FAMILIES[w],
          color,
          letterSpacing: ls !== undefined ? ls * size : undefined,
          fontVariant: tabular ? ['tabular-nums'] : undefined,
          textAlign: center ? 'center' : undefined,
          textTransform: upper ? 'uppercase' : undefined,
          lineHeight: lineHeight !== undefined ? lineHeight * size : undefined,
        },
        style,
      ]}
    >
      {children}
    </Text>
  );
}
