import { colors } from '../theme';
import { Pressable98 } from './Pressable98';
import { Txt } from './Txt';

// Full-width CTA (Proto onboarding footers): 16-radius, 900 uppercase label.
export function BigButton({
  label,
  onPress,
  bg = colors.accent,
  color = colors.ink,
  pad = 16,
  size = 14,
}: {
  label: string;
  onPress: () => void;
  bg?: string;
  color?: string;
  pad?: number;
  size?: number;
}) {
  return (
    <Pressable98
      onPress={onPress}
      style={{ backgroundColor: bg, borderRadius: 16, padding: pad, alignItems: 'center' }}
    >
      <Txt size={size} w={900} ls={0.02} color={color}>
        {label}
      </Txt>
    </Pressable98>
  );
}

// Quiet text link used under CTAs.
export function LinkButton({
  label,
  onPress,
  color = colors.mutedDark,
  pad = 10,
}: {
  label: string;
  onPress: () => void;
  color?: string;
  pad?: number;
}) {
  return (
    <Pressable98 onPress={onPress} style={{ padding: pad, alignItems: 'center' }}>
      <Txt size={12.5} w={700} color={color}>
        {label}
      </Txt>
    </Pressable98>
  );
}
