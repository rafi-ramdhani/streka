import Svg, { Path } from 'react-native-svg';
import { colors } from '../theme';

// The 13x10 check used across sheets, toasts and onboarding lists.
export function Check({
  width = 13,
  color = colors.accentOnDark,
}: {
  width?: number;
  color?: string;
}) {
  return (
    <Svg width={width} height={(width * 10) / 13} viewBox="0 0 13 10">
      <Path
        d="M1 5l4 4L12 1"
        stroke={color}
        strokeWidth={2.2}
        fill="none"
        strokeLinecap="round"
      />
    </Svg>
  );
}
