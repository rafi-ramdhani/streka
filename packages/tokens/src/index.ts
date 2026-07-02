// Design tokens transcribed from design_handoff_streka/README.md "Design Tokens".
// The handoff is final and high fidelity; do not tweak values here without an
// owner decision.

export const colors = {
  accent: '#17C25F',
  accentOnLight: '#17A253',
  accentOnDark: '#3FE07F',
  ink: '#0B1C10',
  appBg: '#131712',
  tile: '#1D231C',
  webBg: '#F5F7F3',
  cardLight: '#FFFFFF',
  cardLightBorder: 'rgba(0,0,0,.06)',
  mutedDark: '#8A938A',
  mutedLight: '#6B736B',
  amber: '#FFB74D',
  amberBg: 'rgba(255,183,77,.15)',
  danger: '#E0654F',
  dividerOnDarkFaint: 'rgba(255,255,255,.06)',
  dividerOnDark: 'rgba(255,255,255,.12)',
  white: '#FFFFFF',
} as const;

export const radii = {
  tile: 22,
  card: 20,
  sheet: 28,
  button: 16,
  buttonSmall: 14,
  pill: 999,
} as const;

export const spacing = {
  gridGap: 12,
  gridGapTight: 10,
  screenPad: 20,
  screenPadWide: 24,
  screenPadTight: 18,
  hitTarget: 44,
} as const;

export const type = {
  family: 'Archivo',
  wordmark: {
    weight: '900',
    italic: true,
    letterSpacing: -0.03, // em
    transform: 'uppercase',
  },
  hero: { weight: '900', letterSpacing: -0.03, minSize: 38, maxSize: 96, tabularNums: true },
  tileTitle: { size: 22, weight: '900' },
  tileLabel: { size: 11, weight: '700', letterSpacing: 0.06, transform: 'uppercase' },
  bodyMin: 13,
  bodyMax: 15,
  minText: 10,
} as const;

// Brand mark: a single rounded bar ("the slash") rotated 32 degrees in a
// 46x46 viewBox. Dark mark on green, green mark on dark surfaces.
export const slashMark = {
  viewBox: 46,
  x: 16,
  y: -8,
  width: 14,
  height: 62,
  rx: 7,
  rotate: 32,
  cx: 23,
  cy: 23,
} as const;

export const tagline = 'Keep the streak.';
