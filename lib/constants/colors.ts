/**
 * アプリケーション共通カラーパレット
 * LP "Oita Organic Elegance" を基準に全画面で統一
 */

// ===================================================================
// DESIGN SYSTEM: "Oita Organic Elegance"
// ===================================================================
export const designTokens = {
  colors: {
    primary: {
      base: '#6E7F80',      // スモークブルー
      dark: '#5A6B6C',
      light: '#8A9A9B',
      contrast: '#FFFFFF',
    },
    secondary: {
      fern: '#8A9A5B',
      fernLight: '#A4B47A',
      fernDark: '#6F7D48',
      stone: '#C2B8A3',
      stoneLight: '#D4CCBA',
      stoneDark: '#A89E8A',
    },
    accent: {
      lilac: '#BFA3D1',
      lilacLight: '#D4C2E3',
      lilacDark: '#9B7FB5',
      gold: '#E2C275',
      goldLight: '#EDD49A',
      goldDark: '#C9A85C',
    },
    background: {
      mist: '#F4F5F2',
      cloud: '#E6E9E5',
      white: '#FFFFFF',
    },
    text: {
      primary: '#2D3436',
      secondary: '#636E72',
      muted: '#95A5A6',
      inverse: '#FFFFFF',
    },
    functional: {
      error: '#E74C3C',
      success: '#27AE60',
      warning: '#F39C12',
      info: '#3498DB',
    },
  },
  elevation: {
    subtle: '0 1px 3px rgba(110, 127, 128, 0.08)',
    low: '0 2px 8px rgba(110, 127, 128, 0.10)',
    medium: '0 4px 16px rgba(110, 127, 128, 0.12)',
    high: '0 8px 32px rgba(110, 127, 128, 0.15)',
    dramatic: '0 16px 48px rgba(110, 127, 128, 0.20)',
  },
  radius: {
    sm: '8px',
    md: '12px',
    lg: '16px',
    xl: '24px',
    full: '9999px',
  },
  typography: {
    display: "'Sora', 'Noto Sans JP', sans-serif",
    body: "'IBM Plex Sans JP', 'Noto Sans JP', sans-serif",
  },
} as const;

/** 従来の COLORS は designTokens からマッピング（イベント一覧・他で利用） */
export const COLORS = {
  primary: designTokens.colors.primary.base,
  primaryDark: designTokens.colors.primary.dark,
  primaryLight: designTokens.colors.primary.light,
  secondary: designTokens.colors.secondary.fern,
  background: designTokens.colors.background.mist,
  surface: designTokens.colors.background.white,
  cream: designTokens.colors.accent.gold,
  mint: designTokens.colors.secondary.fern,
  border: designTokens.colors.secondary.stone,
  borderDark: designTokens.colors.secondary.stoneDark,
  textPrimary: designTokens.colors.text.primary,
  textSecondary: designTokens.colors.text.secondary,
  textMuted: designTokens.colors.text.muted,
  success: designTokens.colors.functional.success,
  warning: designTokens.colors.functional.warning,
  error: designTokens.colors.functional.error,
  info: designTokens.colors.functional.info,
} as const;

export type ColorKey = keyof typeof COLORS;
export type ColorValue = (typeof COLORS)[ColorKey];

export const CSS_VARIABLES = {
  '--color-primary': COLORS.primary,
  '--color-primary-dark': COLORS.primaryDark,
  '--color-secondary': COLORS.secondary,
  '--color-background': COLORS.background,
  '--color-surface': COLORS.surface,
  '--color-cream': COLORS.cream,
  '--color-mint': COLORS.mint,
  '--color-border': COLORS.border,
} as const;

export const GRADIENTS = {
  primary: `linear-gradient(to right, ${COLORS.textSecondary}, ${COLORS.primary}, ${COLORS.textSecondary})`,
  primaryHover: `linear-gradient(to right, ${COLORS.primaryDark}, ${COLORS.secondary}, ${COLORS.primaryDark})`,
  parchment: `linear-gradient(to bottom, ${COLORS.surface}, ${COLORS.background})`,
  gold: `linear-gradient(to right, ${COLORS.cream}, ${COLORS.surface}, ${COLORS.cream})`,
} as const;

export const SHADOWS = {
  sm: '0 1px 2px rgba(45, 52, 54, 0.1)',
  md: '0 4px 6px rgba(45, 52, 54, 0.1)',
  lg: '0 10px 15px rgba(45, 52, 54, 0.15)',
  xl: '0 20px 25px rgba(45, 52, 54, 0.2)',
  rpg: '8px 8px 0px 0px rgba(45, 52, 54, 0.2)',
} as const;
