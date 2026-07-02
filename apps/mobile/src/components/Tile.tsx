import type { ReactNode } from 'react';
import { View } from 'react-native';
import { colors } from '../theme';
import { Pressable98 } from './Pressable98';
import { Txt } from './Txt';

export interface TileProps {
  label: string;
  title: string;
  sub?: string;
  subColor?: string;
  width: number;
  onPress?: () => void;
  onLongPress?: () => void;
  plus?: boolean;
  plusTinted?: boolean; // green-tinted bubble (workout tile)
  border?: boolean; // subtle green border (workout idle)
  footer?: ReactNode;
  green?: boolean; // logged variant, solid accent
  dim?: boolean;
}

// Board tile (Proto:440-509): dark 20-radius card, uppercase label, 22/900
// title, optional + bubble at top right.
export function Tile({
  label,
  title,
  sub,
  subColor,
  width,
  onPress,
  onLongPress,
  plus,
  plusTinted,
  border,
  footer,
  green,
  dim,
}: TileProps) {
  const fg = green ? colors.ink : colors.white;
  return (
    <Pressable98
      onPress={onPress}
      onLongPress={onLongPress}
      disabled={!onPress && !onLongPress}
      style={{
        width,
        backgroundColor: green ? colors.accent : colors.tile,
        borderRadius: 20,
        padding: 16,
        opacity: dim ? 0.85 : 1,
        borderWidth: border ? 1 : 0,
        borderColor: border ? 'rgba(63,224,127,.25)' : undefined,
      }}
    >
      {plus ? (
        <View
          style={{
            position: 'absolute',
            top: 12,
            right: 12,
            width: 26,
            height: 26,
            borderRadius: 13,
            backgroundColor: plusTinted ? 'rgba(23,194,95,.2)' : 'rgba(255,255,255,.1)',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Txt size={15} w={800} color={colors.accentOnDark}>
            +
          </Txt>
        </View>
      ) : null}
      <Txt
        size={11}
        w={700}
        ls={0.06}
        upper
        color={green ? undefined : colors.mutedDark}
        style={green ? { color: colors.ink, opacity: 0.65 } : undefined}
      >
        {label}
      </Txt>
      <Txt size={22} w={900} color={fg} lineHeight={1.1} style={{ marginTop: 2 }}>
        {title}
      </Txt>
      {sub ? (
        <Txt
          size={11.5}
          w={600}
          color={subColor ?? (green ? colors.ink : colors.mutedDark)}
          style={[{ marginTop: 2 }, green ? { opacity: 0.7 } : null]}
        >
          {sub}
        </Txt>
      ) : null}
      {footer}
    </Pressable98>
  );
}
