/**
 * Design tokens. Brand values come from the Venture Hub web app
 * (orange #F99F07, cream #FFF8EE, brown ink #2C2419).
 *
 * Note on contrast: white text on brand orange is only ~2:1, so primary
 * buttons use dark ink text on orange instead (~8:1).
 */
export const colors = {
  brand: '#F99F07',
  brandStrong: '#C27803',
  brandSoft: '#FEEBC8',
  brandTint: '#FFF4E0',

  background: '#FFF8EE',
  surface: '#FFFFFF',
  surfaceMuted: '#F7F2EA',
  border: '#EADFCC',
  borderStrong: '#D9CBB3',

  ink: '#2C2419',
  inkMuted: '#6B5E4E',
  inkSubtle: '#9A8C78',
  inkInverse: '#FFFFFF',

  link: '#115E59',

  success: '#047857',
  successSoft: '#ECFDF5',
  warning: '#B45309',
  warningSoft: '#FFFBEB',
  danger: '#B91C1C',
  dangerSoft: '#FEF2F2',
  info: '#1D4ED8',
  infoSoft: '#EFF6FF',

  overlay: 'rgba(44, 36, 25, 0.45)',
} as const;

export const space = {
  xxs: 2,
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 32,
} as const;

export const radius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  pill: 999,
} as const;

export const type = {
  display: { fontSize: 30, lineHeight: 36, fontWeight: '800' },
  title: { fontSize: 22, lineHeight: 28, fontWeight: '700' },
  heading: { fontSize: 18, lineHeight: 24, fontWeight: '700' },
  body: { fontSize: 16, lineHeight: 22, fontWeight: '400' },
  bodyStrong: { fontSize: 16, lineHeight: 22, fontWeight: '600' },
  label: { fontSize: 14, lineHeight: 20, fontWeight: '600' },
  caption: { fontSize: 13, lineHeight: 18, fontWeight: '400' },
  overline: { fontSize: 12, lineHeight: 16, fontWeight: '700', letterSpacing: 0.6 },
} as const;

/** Minimum touch target (dp). POS buttons should use `touch.large`. */
export const touch = {
  min: 48,
  large: 56,
} as const;

export type Tone = 'neutral' | 'brand' | 'success' | 'warning' | 'danger' | 'info';

export const toneColors: Record<Tone, { fg: string; bg: string }> = {
  neutral: { fg: colors.inkMuted, bg: colors.surfaceMuted },
  brand: { fg: colors.brandStrong, bg: colors.brandTint },
  success: { fg: colors.success, bg: colors.successSoft },
  warning: { fg: colors.warning, bg: colors.warningSoft },
  danger: { fg: colors.danger, bg: colors.dangerSoft },
  info: { fg: colors.info, bg: colors.infoSoft },
};
