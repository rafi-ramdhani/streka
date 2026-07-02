export { colors, radii, spacing, slashMark, type } from '@streka/tokens';

// Archivo static font keys registered in app/_layout.tsx. Use these names in
// fontFamily; never the raw string 'Archivo'.
export const fonts = {
  regular: 'Archivo_400Regular',
  medium: 'Archivo_500Medium',
  semibold: 'Archivo_600SemiBold',
  bold: 'Archivo_700Bold',
  extrabold: 'Archivo_800ExtraBold',
  black: 'Archivo_900Black',
  blackItalic: 'Archivo_900Black_Italic',
} as const;
