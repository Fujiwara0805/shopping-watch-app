/**
 * アプリケーション共通カラーパレット
 * DESIGN.md "KURKKU FIELDS" を基準に全画面で統一
 * 互換性のため designTokens のキー構造は維持し、値のみ KURKKU パレットへ差し替え。
 */

// ===================================================================
// DESIGN SYSTEM: "KURKKU FIELDS"（カテゴリ別カラーコーディング / 直角 / 純黒）
// ===================================================================
export const designTokens = {
  colors: {
    primary: {
      base: '#829A2A',      // オリーブグリーン（INFORMATION / ブランド基調）
      dark: '#6B7F23',
      light: '#9EAF19',     // ライムグリーン（FARM）
      contrast: '#FFFFFF',
    },
    secondary: {
      fern: '#5F9133',      // ディープグリーン（SUSTAINABILITY）
      fernLight: '#9EAF19', // ライムグリーン（FARM）
      fernDark: '#4D7329',
      stone: '#949490',     // ウォームグレー（PEOPLE）
      stoneLight: '#A8AAA9',// ミディアムグレー（STAY）
      stoneDark: '#6F6F6C',
    },
    accent: {
      lilac: '#DC8F74',     // テラコッタ（ART）= 主アクセント（地図ピン・CTA）
      lilacLight: '#E8B5A2',
      lilacDark: '#C4715A',
      gold: '#EEB200',      // ウォームアンバー（EAT）= 強調・特典
      goldLight: '#F4CF66',
      goldDark: '#C99500',
    },
    background: {
      mist: '#FFFFFF',      // ページ地（KURKKU は白）
      cloud: '#EFF4F8',     // ナビ／muted 背景
      white: '#FFFFFF',
    },
    text: {
      primary: '#000000',   // 純黒（本文・見出し）
      secondary: '#3D3D3B',
      muted: '#949490',     // ウォームグレー（PEOPLE）
      inverse: '#FFFFFF',
    },
    functional: {
      error: '#C04040',     // Danger（テラコッタ寄りの赤）
      success: '#5F9133',   // Success（SUSTAINABILITY と兼用）
      warning: '#D4960A',   // Warning（アンバー系黄土）
      info: '#4082AB',      // Info（EVENT ディープブルー）
    },
    // KURKKU カテゴリカラーシステム（ブランドの核心 / 色＝ナビゲーション）
    category: {
      information: '#829A2A',  // オリーブグリーン
      eat: '#EEB200',         // ウォームアンバー
      people: '#949490',      // ウォームグレー
      experience: '#89B2C9',  // スカイブルー
      art: '#DC8F74',         // テラコッタ
      event: '#4082AB',       // ディープブルー
      sustainability: '#5F9133', // ディープグリーン
      farm: '#9EAF19',        // ライムグリーン
      stay: '#A8AAA9',        // ミディアムグレー
      other: '#DCDEDD',       // ライトグレー
    },
    highlight: '#FFFF00',     // アテンション用イエロー
    navBg: '#EFF4F8',         // ナビゲーション背景
  },
  // DESIGN.md §6: 影がカードの唯一の立体表現（X オフセット 2px・わずかに暖色寄り）
  elevation: {
    subtle: 'none',
    low: '2px 4px 5px 0px rgba(4, 0, 0, 0.15)',
    medium: '2px 4px 5px 0px rgba(4, 0, 0, 0.3)',
    high: '2px 6px 10px 0px rgba(4, 0, 0, 0.3)',
    dramatic: '4px 8px 18px 0px rgba(4, 0, 0, 0.35)',
  },
  // DESIGN.md §5: border-radius は一律 0（全要素直角）
  radius: {
    sm: '0',
    md: '0',
    lg: '0',
    xl: '0',
    full: '0',
  },
  typography: {
    // DESIGN.md §3: 和文は Noto Sans JP 一本（明朝なし）／EN ラベルのみ Helvetica スタック
    display: "var(--font-noto-sans-jp), 'Noto Sans JP', sans-serif",
    body: "var(--font-noto-sans-jp), 'Noto Sans JP', sans-serif",
    enLabel: 'Helvetica, "Helvetica Neue", Roboto, sans-serif',
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
