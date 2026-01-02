/**
 * アプリケーション共通カラーパレット
 * トクドクのブランドカラーとUIカラーを定義
 */

export const COLORS = {
  // プライマリカラー
  primary: '#8b6914',        // ゴールドブラウン
  primaryDark: '#3d2914',    // ダークブラウン
  primaryLight: '#a67c00',   // ライトゴールド
  
  // セカンダリカラー
  secondary: '#5c3a21',      // ミディアムブラウン
  
  // 背景色
  background: '#f5e6d3',     // ベージュ
  surface: '#fff8f0',        // オフホワイト
  
  // アクセントカラー
  cream: '#ffecd2',          // クリーム
  mint: '#e8f4e5',           // ミントグリーン
  
  // ボーダー
  border: '#d4c4a8',         // ライトベージュ
  borderDark: '#8b7355',     // ダークベージュ
  
  // テキスト
  textPrimary: '#3d2914',    // プライマリテキスト
  textSecondary: '#5c3a21',  // セカンダリテキスト
  textMuted: '#8b7355',      // ミュートテキスト
  
  // ステータス
  success: '#22c55e',        // 成功
  warning: '#f59e0b',        // 警告
  error: '#ef4444',          // エラー
  info: '#3b82f6',           // 情報
} as const;

export type ColorKey = keyof typeof COLORS;
export type ColorValue = typeof COLORS[ColorKey];

/**
 * カラーパレットのCSSカスタムプロパティ形式
 * Tailwind CSSのテーマ拡張に使用可能
 */
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

/**
 * グラデーション定義
 */
export const GRADIENTS = {
  primary: `linear-gradient(to right, ${COLORS.secondary}, ${COLORS.primary}, ${COLORS.secondary})`,
  primaryHover: `linear-gradient(to right, ${COLORS.primaryDark}, ${COLORS.secondary}, ${COLORS.primaryDark})`,
  parchment: `linear-gradient(to bottom, ${COLORS.surface}, ${COLORS.background})`,
  gold: `linear-gradient(to right, ${COLORS.cream}, ${COLORS.surface}, ${COLORS.cream})`,
} as const;

/**
 * シャドウ定義
 */
export const SHADOWS = {
  sm: '0 1px 2px rgba(61, 41, 20, 0.1)',
  md: '0 4px 6px rgba(61, 41, 20, 0.1)',
  lg: '0 10px 15px rgba(61, 41, 20, 0.15)',
  xl: '0 20px 25px rgba(61, 41, 20, 0.2)',
  rpg: '8px 8px 0px 0px rgba(61, 41, 20, 0.3)',  // RPG風シャドウ
} as const;

