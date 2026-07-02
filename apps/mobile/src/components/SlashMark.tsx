import Svg, { Rect } from 'react-native-svg';
import { slashMark } from '../theme';

// The brand mark: one rounded bar rotated 32 degrees (tokens.slashMark).
export function SlashMark({ size, color }: { size: number; color: string }) {
  const m = slashMark;
  return (
    <Svg width={size} height={size} viewBox={`0 0 ${m.viewBox} ${m.viewBox}`}>
      <Rect
        x={m.x}
        y={m.y}
        width={m.width}
        height={m.height}
        rx={m.rx}
        fill={color}
        transform={`rotate(${m.rotate} ${m.cx} ${m.cy})`}
      />
    </Svg>
  );
}
