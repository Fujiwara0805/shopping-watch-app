// 対象者タグの定義（9つ）
export const TARGET_TAGS = [
  { id: 'family', label: '家族向け' },
  { id: 'couple', label: 'カップル向け' },
  { id: 'solo', label: 'ひとり旅向け' },
  { id: 'friends', label: '友人・グループ向け' },
  { id: 'tourist', label: '観光客向け' },
  { id: 'kids', label: '子ども向け' },
  { id: 'senior', label: 'シニア向け' },
  { id: 'business', label: 'ビジネス向け' },
  { id: 'local', label: '地元の方向け' },
] as const;

export type TargetTagId = typeof TARGET_TAGS[number]['id'];

// 対象者タグID→ラベルのマッピング
export const TARGET_TAG_LABELS: Record<string, string> = Object.fromEntries(
  TARGET_TAGS.map(tag => [tag.id, tag.label])
);

/**
 * 検索フォーム用の対象者オプション（「指定なし」を含む）
 * セレクトボックスなどで使用
 */
export const TARGET_AUDIENCE_OPTIONS = [
  { value: 'none', label: '指定なし' },
  ...TARGET_TAGS.map(tag => ({ value: tag.id, label: tag.label })),
];
