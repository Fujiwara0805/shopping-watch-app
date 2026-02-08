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
    { id: 'family_park', label: '公園・アスレチック' },
    { id: 'family_water', label: '川遊び・プール' },
    { id: 'family_animal', label: '動物ふれあい・牧場' },
    { id: 'family_craft', label: '手作り体験・工作' },
    { id: 'family_fruit', label: '味覚狩り（いちご・ぶどう等）' },
    { id: 'family_onsen', label: '家族風呂・温泉' },
    { id: 'family_camp', label: 'キャンプ・グランピング' },
    { id: 'family_aquarium', label: '水族館・科学館' },
    { id: 'family_bbq', label: 'BBQ・ピクニック' },
  ],
  couple: [
    { id: 'couple_dinner', label: 'レストラン・ディナー' },
    { id: 'couple_cafe', label: 'おしゃれカフェ' },
    { id: 'couple_nightview', label: '夜景・星空観賞' },
    { id: 'couple_onsen', label: '貸切温泉・スパ' },
    { id: 'couple_cruise', label: 'クルーズ・遊覧船' },
    { id: 'couple_pottery', label: '陶芸・ガラス細工体験' },
    { id: 'couple_wine', label: 'ワイナリー・酒蔵見学' },
    { id: 'couple_glamping', label: 'グランピング' },
    { id: 'couple_photo', label: 'フォトスポット巡り' },
  ],
  solo: [
    { id: 'solo_cafe', label: '読書カフェ・喫茶' },
    { id: 'solo_onsen', label: '日帰り温泉・サウナ' },
    { id: 'solo_trekking', label: 'トレッキング・登山' },
    { id: 'solo_cycling', label: 'サイクリング' },
    { id: 'solo_gourmet', label: '食べ歩き・地元グルメ' },
    { id: 'solo_goshuin', label: '御朱印・寺社巡り' },
    { id: 'solo_art', label: '美術館・ギャラリー' },
    { id: 'solo_yoga', label: 'ヨガ・瞑想リトリート' },
    { id: 'solo_workation', label: 'ワーケーション' },
  ],
  friends: [
    { id: 'friends_bbq', label: 'BBQ・アウトドア料理' },
    { id: 'friends_rafting', label: 'ラフティング・カヤック' },
    { id: 'friends_foodwalk', label: '食べ歩き・はしご酒' },
    { id: 'friends_camp', label: 'キャンプ・グランピング' },
    { id: 'friends_diving', label: 'ダイビング・シュノーケル' },
    { id: 'friends_paraglider', label: 'パラグライダー・バンジー' },
    { id: 'friends_sports', label: 'SUP・スポーツ体験' },
    { id: 'friends_escape', label: '謎解き・脱出ゲーム' },
    { id: 'friends_onsen', label: '温泉旅行・湯巡り' },
  ],
  tourist: [
    { id: 'tourist_shrine', label: '神社仏閣・パワースポット' },
    { id: 'tourist_onsen', label: '別府・湯布院温泉' },
    { id: 'tourist_gourmet', label: 'とり天・関あじ等ご当地グルメ' },
    { id: 'tourist_souvenir', label: 'お土産・特産品' },
    { id: 'tourist_scenic', label: '絶景スポット・展望台' },
    { id: 'tourist_history', label: '城下町・歴史散策' },
    { id: 'tourist_cruise', label: '遊覧船・観光クルーズ' },
    { id: 'tourist_festival', label: '祭り・花火大会' },
    { id: 'tourist_craft', label: '竹細工・染物等の伝統工芸体験' },
  ],
  kids: [
    { id: 'kids_playground', label: '大型遊具・アスレチック' },
    { id: 'kids_water', label: 'じゃぶじゃぶ池・水遊び' },
    { id: 'kids_animal', label: '動物園・ふれあい牧場' },
    { id: 'kids_craft', label: 'ものづくり・工作体験' },
    { id: 'kids_nature', label: '昆虫採集・自然観察' },
    { id: 'kids_aquarium', label: '水族館・科学実験' },
    { id: 'kids_sport', label: 'ボルダリング・トランポリン' },
    { id: 'kids_farm', label: '収穫体験・酪農体験' },
    { id: 'kids_sand', label: '砂浜遊び・磯遊び' },
  ],
  senior: [
    { id: 'senior_onsen', label: '温泉・湯治' },
    { id: 'senior_garden', label: '庭園散策・盆栽' },
    { id: 'senior_history', label: '史跡巡り・歴史探訪' },
    { id: 'senior_gourmet', label: '懐石料理・郷土料理' },
    { id: 'senior_walk', label: '健康ウォーキング・ハイキング' },
    { id: 'senior_pottery', label: '陶芸・書道体験' },
    { id: 'senior_tea', label: '茶道・華道体験' },
    { id: 'senior_cruise', label: '観光クルーズ・遊覧' },
    { id: 'senior_flower', label: '花の名所・季節の花' },
  ],
  business: [
    { id: 'business_onsen', label: '温泉・露天風呂体験' },
    { id: 'business_kimono', label: '着物・浴衣体験' },
    { id: 'business_gourmet', label: '和食・寿司・懐石' },
    { id: 'business_shrine', label: '神社仏閣・禅体験' },
    { id: 'business_nature', label: '国立公園・ジオパーク' },
    { id: 'business_sake', label: '日本酒・焼酎テイスティング' },
    { id: 'business_craft', label: '竹細工・陶芸ワークショップ' },
    { id: 'business_festival', label: '祭り・伝統芸能' },
    { id: 'business_farm', label: '農泊・田舎暮らし体験' },
  ],
  local: [
    { id: 'local_hidden', label: '穴場スポット・秘境' },
    { id: 'local_gourmet', label: '地元の名店・ローカルフード' },
    { id: 'local_festival', label: '地域の祭り・イベント' },
    { id: 'local_morning', label: '朝市・マルシェ' },
    { id: 'local_onsen', label: '共同浴場・地元温泉' },
    { id: 'local_volunteer', label: 'ボランティア・地域活動' },
    { id: 'local_flower', label: '季節の花・紅葉' },
    { id: 'local_fishing', label: '釣り・海遊び' },
    { id: 'local_farm', label: '家庭菜園・農業体験' },
  ],
};

// アクティビティIDからラベルへのフラットマッピング
export const TAG_ACTIVITY_LABELS: Record<string, string> = Object.fromEntries(
  Object.values(TAG_ACTIVITIES).flatMap(activities =>
    activities.map(a => [a.id, a.label])
  )
);
