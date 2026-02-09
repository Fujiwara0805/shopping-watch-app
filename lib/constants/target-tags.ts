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
    { id: 'family_park', label: '大型遊具・アスレチックパーク' },
    { id: 'family_animal', label: '移動動物園・ふれあい牧場' },
    { id: 'family_craft', label: '親子ワークショップ・工作体験' },
    { id: 'family_harvest', label: '収穫体験・地産地消マルシェ' },
    { id: 'family_aquarium', label: '水族館・科学体験ミュージアム' },
    { id: 'family_camp', label: 'キャンプ・手ぶらBBQ' },
    { id: 'family_seasonal', label: '季節の屋外レジャー（スケート・釣り等）' },
    { id: 'family_reading', label: '読み聞かせ・オーケストラ鑑賞' },
    { id: 'family_edutainment', label: '防災・就農エデュテインメント' },
  ],
  couple: [
    { id: 'couple_dinner', label: 'ホテルブッフェ・贅沢ディナー' },
    { id: 'couple_art', label: 'アートイベント・没入型展示' },
    { id: 'couple_nightview', label: '夜景・ナイトイルミネーション' },
    { id: 'couple_onsen', label: 'リトリート温泉・貸切サウナ' },
    { id: 'couple_craft', label: 'ペアクラフト・手作り工房' },
    { id: 'couple_wine', label: 'ワイナリー・酒蔵見学ツアー' },
    { id: 'couple_photo', label: '絶景ドライブ・フォトスポット' },
    { id: 'couple_live', label: '音楽ライブ・アーティスト交流' },
    { id: 'couple_cruise', label: 'ナイトクルーズ・星空観賞会' },
  ],
  solo: [
    { id: 'solo_cafe', label: '読書・古民家カフェ巡り' },
    { id: 'solo_sauna', label: 'ととのいサウナ・本格湯治体験' },
    { id: 'solo_trekking', label: 'ソロトレッキング・低山登山' },
    { id: 'solo_history', label: '歴史探訪・ガイド付き街歩き' },
    { id: 'solo_art', label: '美術館・ギャラリー巡り' },
    { id: 'solo_gourmet', label: '地元の名店・カウンターグルメ' },
    { id: 'solo_goshuin', label: '御朱印・パワースポット巡り' },
    { id: 'solo_learning', label: '自分磨き・学びの講演会' },
    { id: 'solo_workation', label: 'ワーケーション・静寂のスポット' },
  ],
  friends: [
    { id: 'friends_bbq', label: 'バーベキュー・アウトドアサウナ' },
    { id: 'friends_foodwalk', label: '食べ歩き・地酒はしごツアー' },
    { id: 'friends_sup', label: 'SUP・ウォータースポーツ体験' },
    { id: 'friends_escape', label: '謎解き・脱出ゲームイベント' },
    { id: 'friends_camp', label: 'キャンプ・グランピング体験' },
    { id: 'friends_tech', label: 'ハイテク体験（VR・ドローンなど）' },
    { id: 'friends_tradition', label: '伝統行事・火祭り参加' },
    { id: 'friends_sports', label: 'スポーツ観戦・グループ交流会' },
    { id: 'friends_live', label: 'ライブイベント・音楽フェス' },
  ],
  tourist: [
    { id: 'tourist_performance', label: '由布院・別府の伝統芸能鑑賞' },
    { id: 'tourist_gourmet', label: 'ご当地グルメ・旬の味覚堪能' },
    { id: 'tourist_scenic', label: '絶景パノラマ・展望スポット' },
    { id: 'tourist_history', label: 'ガイド付き歴史散策・古図歩き' },
    { id: 'tourist_festival', label: '季節の祭り・火祭りイベント' },
    { id: 'tourist_castle', label: '城下町ひなめぐり・散策' },
    { id: 'tourist_sake', label: '酒蔵・ワイナリー見学体験' },
    { id: 'tourist_onsen', label: '温泉文化・地熱シンポジウム' },
    { id: 'tourist_craft', label: '伝統工芸・職人技ワークショップ' },
  ],
  kids: [
    { id: 'kids_playground', label: '大型遊具・アスレチック広場' },
    { id: 'kids_animal', label: '移動動物園・ふれあい牧場' },
    { id: 'kids_craft', label: '子どもワークショップ・創作体験' },
    { id: 'kids_digital', label: 'デジタル・VR・ドローン体験' },
    { id: 'kids_nature', label: '生きもの観察・自然調査ツアー' },
    { id: 'kids_aquarium', label: '水族館・バックヤードツアー' },
    { id: 'kids_seasonal', label: '季節の遊び（凧揚げ・スケートなど）' },
    { id: 'kids_food', label: '食育体験（豆腐作り・農作業など）' },
    { id: 'kids_kagura', label: '子ども神楽・伝統文化に挑戦' },
  ],
  senior: [
    { id: 'senior_onsen', label: '温泉湯治・健康促進スパ' },
    { id: 'senior_walk', label: '絶景ウォーキング・歴史散歩' },
    { id: 'senior_classic', label: '古典芸能・伝統文化の鑑賞' },
    { id: 'senior_gourmet', label: '郷土の美食・オーガニック食' },
    { id: 'senior_flower', label: '季節の花巡り・庭園ガイド' },
    { id: 'senior_craft', label: '伝統工芸・職人技の体験' },
    { id: 'senior_learning', label: '学びの市民講座・シンポジウム' },
    { id: 'senior_festival', label: '地域の祭り・伝統行事の観覧' },
    { id: 'senior_cruise', label: '観光列車・ゆったりクルーズ' },
  ],
  business: [
    { id: 'business_onsen', label: '温泉・神仏習合の精神体験' },
    { id: 'business_performance', label: '伝統芸能（神楽・和太鼓など）鑑賞' },
    { id: 'business_market', label: '地元の旬・魚市場の朝市見学' },
    { id: 'business_craft', label: '職人技（竹細工等）の制作体験' },
    { id: 'business_kimono', label: '着物・浴衣で巡る武家屋敷' },
    { id: 'business_sake', label: '酒蔵見学・テイスティング' },
    { id: 'business_garden', label: '日本庭園・史跡のアート展示' },
    { id: 'business_festival', label: '火祭り・日本の奇祭への参加' },
    { id: 'business_farm', label: '農泊・里山暮らしの文化体験' },
  ],
  local: [
    { id: 'local_marche', label: '週末マルシェ・街角マーケット' },
    { id: 'local_newshop', label: '新店オープン・リニューアル施設' },
    { id: 'local_workshop', label: '地域密着・市民ワークショップ' },
    { id: 'local_tradition', label: '地元の伝統行事（どんど焼など）' },
    { id: 'local_sports', label: 'スポーツ応援・市民マラソン' },
    { id: 'local_concert', label: '文化会館のコンサート・演劇' },
    { id: 'local_agriculture', label: '農林水産祭・JA感謝祭など' },
    { id: 'local_rediscover', label: 'わが町再発見・歴史謎解き' },
    { id: 'local_onsen', label: '共同浴場・期間限定の湯巡り' },
  ],
};

// アクティビティIDからラベルへのフラットマッピング
export const TAG_ACTIVITY_LABELS: Record<string, string> = Object.fromEntries(
  Object.values(TAG_ACTIVITIES).flatMap(activities =>
    activities.map(a => [a.id, a.label])
  )
);
