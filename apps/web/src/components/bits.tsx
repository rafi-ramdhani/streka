import type { CSSProperties, ReactNode } from 'react';
import { colors, slashMark } from '@streka/tokens';

export function Slash({ size, color }: { size: number; color: string }) {
  const m = slashMark;
  return (
    <svg width={size} height={size} viewBox={`0 0 ${m.viewBox} ${m.viewBox}`}>
      <rect
        x={m.x}
        y={m.y}
        width={m.width}
        height={m.height}
        rx={m.rx}
        fill={color}
        transform={`rotate(${m.rotate} ${m.cx} ${m.cy})`}
      />
    </svg>
  );
}

export function CheckSvg({ color = colors.accentOnDark }: { color?: string }) {
  return (
    <svg width={13} height={10} viewBox="0 0 13 10" style={{ flex: 'none' }}>
      <path d="M1 5l4 4L12 1" stroke={color} strokeWidth={2.2} fill="none" strokeLinecap="round" />
    </svg>
  );
}

// White light-theme card (web board/trends/goals).
export function Card({
  children,
  style,
  dark,
}: {
  children: ReactNode;
  style?: CSSProperties;
  dark?: boolean;
}) {
  return (
    <div
      style={{
        background: dark ? colors.appBg : colors.cardLight,
        color: dark ? '#fff' : undefined,
        border: dark ? 'none' : `1px solid ${colors.cardLightBorder}`,
        borderRadius: 20,
        padding: dark ? 22 : 18,
        ...style,
      }}
    >
      {children}
    </div>
  );
}

export function TileLabel({ children, dark }: { children: ReactNode; dark?: boolean }) {
  return (
    <div
      style={{
        fontSize: 11,
        fontWeight: 700,
        letterSpacing: '.06em',
        textTransform: 'uppercase',
        color: dark ? colors.mutedDark : colors.mutedLight,
      }}
    >
      {children}
    </div>
  );
}

export function Toggle({ on, onToggle }: { on: boolean; onToggle: () => void }) {
  return (
    <div
      onClick={onToggle}
      role="switch"
      aria-checked={on}
      style={{
        width: 40,
        height: 24,
        borderRadius: 12,
        background: on ? colors.accent : '#dfe3dd',
        position: 'relative',
        cursor: 'pointer',
        flex: 'none',
      }}
    >
      <div
        style={{
          position: 'absolute',
          top: 2,
          ...(on ? { right: 2 } : { left: 2 }),
          width: 20,
          height: 20,
          borderRadius: '50%',
          background: '#fff',
        }}
      />
    </div>
  );
}

export function WeekBars({
  bars,
  height = 64,
}: {
  bars: { h: number; on: boolean; label: string; today?: boolean; dashed?: boolean }[];
  height?: number;
}) {
  return (
    <div style={{ display: 'flex', gap: 8, marginTop: 14, alignItems: 'flex-end', height }}>
      {bars.map((b, i) => (
        <div
          key={i}
          style={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 5,
            justifyContent: 'flex-end',
            height: '100%',
          }}
        >
          <div
            style={{
              width: '100%',
              height: b.h,
              borderRadius: 6,
              ...(b.dashed
                ? { border: '1.5px dashed rgba(0,0,0,.15)', background: 'transparent' }
                : { background: b.on ? colors.accent : '#eef0ec' }),
              boxShadow: b.today && b.on ? '0 0 0 2px rgba(23,162,83,.35)' : undefined,
            }}
          />
          <span
            style={{
              fontSize: 10,
              fontWeight: b.today ? 800 : 700,
              color: b.today ? undefined : colors.mutedLight,
            }}
          >
            {b.label}
          </span>
        </div>
      ))}
    </div>
  );
}
