// 対象者タグの定義（9つ）
export const TARGET_TAGS = [
  { id: 'family', label: '家族向け' },
  { id: 'couple', label: 'カップル向け' },
  { id: 'solo', label: 'ひとり旅向け' },
  { id: 'friends', label: '友人・グループ向け' },
  { id: 'tourist', label: '観光客向け' },
  { id: 'kids', label: '子ども向け' },
  { id: 'senior', label: 'シニア向け' },
  { id: 'business', label: 'インバウンド向け' },
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
 * アソビュー・じゃらん等のアクティビティサイトを参考に、対象者向けに厳選
 */
export const TAG_ACTIVITIES: Record<TargetTagId, { id: string; label: string }[]> = {
  family: [
    { id: 'family_outdoor', label: 'アウトドア・レジャー' },
    { id: 'family_animal', label: '動物ふれあい体験' },
    { id: 'family_craft', label: 'ワークショップ・ものづくり' },
    { id: 'family_food', label: 'グルメ・マルシェ' },
    { id: 'family_museum', label: 'ミュージアム・科学体験' },
    { id: 'family_camp', label: 'キャンプ・BBQ' },
    { id: 'family_seasonal', label: '季節イベント' },
    { id: 'family_culture', label: '音楽・文化鑑賞' },
    { id: 'family_learning', label: '学び・教育体験' },
  ],
  couple: [
    { id: 'couple_gourmet', label: 'グルメ・ディナー' },
    { id: 'couple_art', label: 'アート・展示会' },
    { id: 'couple_illumination', label: 'イルミネーション・夜景' },
    { id: 'couple_relaxation', label: '温泉・リラクゼーション' },
    { id: 'couple_craft', label: 'ものづくり・手作り体験' },
    { id: 'couple_wine', label: '酒蔵・ワイナリー見学' },
    { id: 'couple_scenic', label: '絶景・フォトスポット' },
    { id: 'couple_live', label: '音楽・ライブ' },
    { id: 'couple_nature', label: '自然・星空観賞' },
  ],
  solo: [
    { id: 'solo_cafe', label: 'カフェ・読書' },
    { id: 'solo_wellness', label: '温泉・サウナ' },
    { id: 'solo_hiking', label: 'ハイキング・登山' },
    { id: 'solo_history', label: '歴史・街歩き' },
    { id: 'solo_art', label: '美術館・ギャラリー' },
    { id: 'solo_gourmet', label: 'グルメ・食べ歩き' },
    { id: 'solo_shrine', label: '神社仏閣・パワースポット' },
    { id: 'solo_learning', label: '講座・セミナー' },
    { id: 'solo_workation', label: 'ワーケーション' },
  ],
  friends: [
    { id: 'friends_bbq', label: 'BBQ・アウトドア' },
    { id: 'friends_foodwalk', label: '食べ歩き・飲み歩き' },
    { id: 'friends_sports', label: 'スポーツ・アクティビティ' },
    { id: 'friends_game', label: '謎解き・体験型イベント' },
    { id: 'friends_camp', label: 'キャンプ・グランピング' },
    { id: 'friends_tech', label: 'デジタル・テクノロジー体験' },
    { id: 'friends_festival', label: '祭り・伝統行事' },
    { id: 'friends_cheering', label: 'スポーツ観戦・応援' },
    { id: 'friends_live', label: '音楽フェス・ライブ' },
  ],
  tourist: [
    { id: 'tourist_culture', label: '伝統芸能・文化体験' },
    { id: 'tourist_gourmet', label: 'ご当地グルメ' },
    { id: 'tourist_scenic', label: '絶景・展望スポット' },
    { id: 'tourist_history', label: '歴史散策・街歩き' },
    { id: 'tourist_festival', label: '祭り・イベント' },
    { id: 'tourist_townwalk', label: '城下町・町並み散策' },
    { id: 'tourist_sake', label: '酒蔵・醸造所見学' },
    { id: 'tourist_onsen', label: '温泉・スパ' },
    { id: 'tourist_craft', label: '工芸・ものづくり体験' },
  ],
  kids: [
    { id: 'kids_playground', label: 'アスレチック・遊び場' },
    { id: 'kids_animal', label: '動物ふれあい' },
    { id: 'kids_craft', label: 'ワークショップ・工作' },
    { id: 'kids_digital', label: 'デジタル・テクノロジー体験' },
    { id: 'kids_nature', label: '自然観察・アウトドア' },
    { id: 'kids_aquarium', label: '水族館・博物館' },
    { id: 'kids_seasonal', label: '季節の遊び' },
    { id: 'kids_food', label: '食育・料理体験' },
    { id: 'kids_tradition', label: '伝統文化体験' },
  ],
  senior: [
    { id: 'senior_onsen', label: '温泉・健康づくり' },
    { id: 'senior_walk', label: 'ウォーキング・散策' },
    { id: 'senior_culture', label: '芸能・文化鑑賞' },
    { id: 'senior_gourmet', label: '郷土料理・食の体験' },
    { id: 'senior_flower', label: '花・庭園めぐり' },
    { id: 'senior_craft', label: '工芸・ものづくり体験' },
    { id: 'senior_learning', label: '講座・セミナー' },
    { id: 'senior_festival', label: '祭り・伝統行事' },
    { id: 'senior_cruise', label: '観光列車・クルーズ' },
  ],
  business: [
    { id: 'business_onsen', label: '温泉・精神文化体験' },
    { id: 'business_performance', label: '伝統芸能鑑賞' },
    { id: 'business_market', label: '朝市・地元市場' },
    { id: 'business_craft', label: '工芸・職人技体験' },
    { id: 'business_kimono', label: '着物・和装体験' },
    { id: 'business_sake', label: '酒蔵・テイスティング' },
    { id: 'business_garden', label: '庭園・史跡見学' },
    { id: 'business_festival', label: '祭り・地域行事' },
    { id: 'business_farm', label: '農泊・田舎暮らし体験' },
  ],
  local: [
    { id: 'local_marche', label: 'マルシェ・マーケット' },
    { id: 'local_newshop', label: '新店・施設オープン' },
    { id: 'local_workshop', label: 'ワークショップ・講座' },
    { id: 'local_tradition', label: '伝統行事・地域祭り' },
    { id: 'local_sports', label: 'スポーツイベント' },
    { id: 'local_concert', label: 'コンサート・演劇' },
    { id: 'local_agriculture', label: '農林水産イベント' },
    { id: 'local_rediscover', label: '地域再発見・歴史散策' },
    { id: 'local_onsen', label: '温泉・湯めぐり' },
  ],
};

// アクティビティIDからラベルへのフラットマッピング
export const TAG_ACTIVITY_LABELS: Record<string, string> = Object.fromEntries(
  Object.values(TAG_ACTIVITIES).flatMap(activities =>
    activities.map(a => [a.id, a.label])
  )
);
