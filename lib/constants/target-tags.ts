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

/**
 * 各対象者タグごとのアクティビティ要素（固定マスターデータ）
 * 各タグに9つのアクティビティを定義
 */
export const TAG_ACTIVITIES: Record<TargetTagId, { id: string; label: string }[]> = {
  family: [
    { id: 'family_park', label: '公園遊び' },
    { id: 'family_water', label: '水遊び' },
    { id: 'family_animal', label: '動物ふれあい' },
    { id: 'family_workshop', label: '体験教室' },
    { id: 'family_fruit', label: 'フルーツ狩り' },
    { id: 'family_onsen', label: '温泉' },
    { id: 'family_nature', label: '自然散策' },
    { id: 'family_craft', label: '手作り体験' },
    { id: 'family_photo', label: '写真撮影' },
  ],
  couple: [
    { id: 'couple_dinner', label: 'ディナー' },
    { id: 'couple_cafe', label: 'カフェ巡り' },
    { id: 'couple_nightview', label: '夜景' },
    { id: 'couple_onsen', label: '温泉' },
    { id: 'couple_drive', label: 'ドライブ' },
    { id: 'couple_photo', label: '写真撮影' },
    { id: 'couple_nature', label: '自然散策' },
    { id: 'couple_shopping', label: 'ショッピング' },
    { id: 'couple_art', label: 'アート鑑賞' },
  ],
  solo: [
    { id: 'solo_cafe', label: '読書カフェ' },
    { id: 'solo_onsen', label: '温泉' },
    { id: 'solo_photo', label: '写真撮影' },
    { id: 'solo_nature', label: '自然散策' },
    { id: 'solo_gourmet', label: 'グルメ' },
    { id: 'solo_goshuin', label: '御朱印巡り' },
    { id: 'solo_art', label: 'アート鑑賞' },
    { id: 'solo_yoga', label: '瞑想・ヨガ' },
    { id: 'solo_workation', label: 'ワーケーション' },
  ],
  friends: [
    { id: 'friends_bbq', label: 'BBQ' },
    { id: 'friends_outdoor', label: 'アウトドア' },
    { id: 'friends_foodwalk', label: '食べ歩き' },
    { id: 'friends_karaoke', label: 'カラオケ' },
    { id: 'friends_drive', label: 'ドライブ' },
    { id: 'friends_onsen', label: '温泉' },
    { id: 'friends_sports', label: 'スポーツ' },
    { id: 'friends_photo', label: '写真撮影' },
    { id: 'friends_camp', label: 'キャンプ' },
  ],
  tourist: [
    { id: 'tourist_shrine', label: '神社仏閣' },
    { id: 'tourist_onsen', label: '温泉' },
    { id: 'tourist_gourmet', label: 'グルメ' },
    { id: 'tourist_souvenir', label: 'お土産' },
    { id: 'tourist_photo', label: '写真撮影' },
    { id: 'tourist_nature', label: '自然散策' },
    { id: 'tourist_history', label: '歴史探訪' },
    { id: 'tourist_local', label: '地元体験' },
    { id: 'tourist_scenic', label: '絶景スポット' },
  ],
  kids: [
    { id: 'kids_playground', label: '遊具' },
    { id: 'kids_water', label: '水遊び' },
    { id: 'kids_animal', label: '動物ふれあい' },
    { id: 'kids_workshop', label: '体験教室' },
    { id: 'kids_icecream', label: 'ソフトクリーム' },
    { id: 'kids_learning', label: '自然学習' },
    { id: 'kids_beach', label: '砂浜遊び' },
    { id: 'kids_train', label: 'ミニ鉄道' },
    { id: 'kids_stamp', label: 'スタンプラリー' },
  ],
  senior: [
    { id: 'senior_onsen', label: '温泉' },
    { id: 'senior_garden', label: '庭園散策' },
    { id: 'senior_history', label: '歴史探訪' },
    { id: 'senior_gourmet', label: 'グルメ' },
    { id: 'senior_walk', label: '健康ウォーキング' },
    { id: 'senior_pottery', label: '陶芸体験' },
    { id: 'senior_tea', label: '茶道体験' },
    { id: 'senior_photo', label: '写真撮影' },
    { id: 'senior_zen', label: '座禅体験' },
  ],
  business: [
    { id: 'business_workation', label: 'ワーケーション' },
    { id: 'business_meeting', label: '会議室' },
    { id: 'business_wifi', label: 'Wi-Fiカフェ' },
    { id: 'business_lunch', label: 'ランチ' },
    { id: 'business_dinner', label: 'ディナー接待' },
    { id: 'business_hotel', label: 'ホテル' },
    { id: 'business_cowork', label: 'コワーキング' },
    { id: 'business_access', label: '交通アクセス' },
    { id: 'business_refresh', label: 'リフレッシュ' },
  ],
  local: [
    { id: 'local_hidden', label: '穴場スポット' },
    { id: 'local_gourmet', label: '地元グルメ' },
    { id: 'local_festival', label: '祭り・行事' },
    { id: 'local_nature', label: '自然散策' },
    { id: 'local_onsen', label: '温泉' },
    { id: 'local_community', label: 'コミュニティ' },
    { id: 'local_flower', label: '季節の花' },
    { id: 'local_fishing', label: '釣り' },
    { id: 'local_farm', label: '農業体験' },
  ],
};

// アクティビティIDからラベルへのフラットマッピング
export const TAG_ACTIVITY_LABELS: Record<string, string> = Object.fromEntries(
  Object.values(TAG_ACTIVITIES).flatMap(activities =>
    activities.map(a => [a.id, a.label])
  )
);
