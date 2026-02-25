# トクドク - 地域イベント発見マップアプリ

『トクドク』は、**大分県のイベント情報に特化したマップ型発見アプリ**です。現在地から近いイベントを地図上で視覚的に探せる、地域密着型プラットフォームです。

**URL**: https://tokudoku.com

---

## サービス概要

お祭り、マルシェ、ワークショップなど、地域で開催されるイベント情報を誰でも簡単に発信・発見できる**イベント特化型マップアプリ**です。

### 主な機能

- **マップビュー**: Google Maps上にイベント・施設をピン表示、リアルタイム位置情報対応
- **イベントカレンダー**: 開催日順・距離順ソート、市町村フィルター、キーワード検索
- **施設マップ**: 観光スポット、グルメ、温泉、トイレ、バス停、駅、避難所、ゴミ箱の8種類
- **施設レポート・投票**: ユーザーによる施設情報の報告とコミュニティ投票
- **イベント投稿**: ユーザーがイベント情報を投稿（カテゴリ・画像・ターゲット設定対応）
- **イベントレビュー**: 星評価＋コメントによるレビュー（ゲスト投稿対応）
- **ユーザー認証**: メール/パスワード、Google OAuth
- **LINE連携**: LINEボット経由の通知・連携
- **スタンプボード**: ゲーミフィケーション要素
- **GTFS交通データ**: バス時刻表の表示
- **広告管理**: イベントプロモーション用の広告機能
- **GA4カスタムイベント**: 15種類のユーザー行動トラッキング

### 対象地域

大分県全18市町村（大分市、別府市、中津市、日田市、佐伯市、臼杵市、津久見市、竹田市、豊後高田市、杵築市、宇佐市、豊後大野市、由布市、国東市、姫島村、日出町、九重町、玖珠町）

---

## 技術スタック

| 分類 | 使用技術 |
|------|----------|
| フレームワーク | Next.js 14 / React 18 / TypeScript 5.3 |
| UI | Tailwind CSS 3.4 / shadcn/ui (Radix UI) / Framer Motion 11 |
| バックエンド | Supabase (PostgreSQL + PostGIS) |
| 認証 | NextAuth.js 4.24 (Google OAuth, LINE, Email/Password) |
| 地図 | Google Maps JavaScript API (@react-google-maps/api) |
| アナリティクス | Google Analytics 4 / @google-analytics/data / Vercel Analytics / Speed Insights |
| メール | Resend |
| 画像 | Cloudinary / Supabase Storage |
| フォーム | React Hook Form / Zod |
| チャート | Recharts |
| メッセージング | @line/bot-sdk |
| 決済 | Stripe |
| インフラ | Vercel (ホスティング) |
| SEO | JSON-LD構造化データ / AI検索エンジン対応 / PWA |

---

## ディレクトリ構造

```
tokudoku-app/
  app/                        # Next.js App Router
    _actions/                 #   Server Actions (posts, profiles, facility-reports, reporters)
    api/                      #   API Routes (22エンドポイント)
      analytics/              #     GA4データ取得
      auth/                   #     認証 (NextAuth, パスワードリセット)
      ads/                    #     広告 (作成, トラッキング)
      contact/                #     お問い合わせ
      event-reviews/          #     イベントレビュー
      facility-reports/       #     施設レポート
      facility-votes/         #     施設投票
      feedback/               #     フィードバック
      gtfs/                   #     交通データ (停留所, 時刻表, インポート)
      line/                   #     LINE (Webhook, 連携)
      og/                     #     OG画像生成
      register/               #     ユーザー登録
      spots/                  #     スポットデータ
      stamp-board/            #     スタンプボード
    area/                     #   地域ページ ([prefecture]/[city])
    events/                   #   イベント一覧・詳細
    map/                      #   マップページ
    post/                     #   イベント投稿
    profile/                  #   ユーザープロフィール
    login/ register/          #   認証ページ
    contact/ faq/             #   サポートページ
    terms/                    #   利用規約・プライバシーポリシー
  components/                 # Reactコンポーネント
    map/                      #   マップ関連 (MapView, SpotSelector, FacilityReport, VoteButtons)
    event/                    #   イベント関連 (EventDetail, ReviewSection)
    seo/                      #   SEO (構造化データ, パンくず, 関連イベント)
    feedback/                 #   フィードバック
    layout/                   #   レイアウト (AppHeader)
    providers/                #   プロバイダー (GoogleMaps, Location, NextAuth)
    ui/                       #   shadcn/ui ベースコンポーネント
    external-content/         #   外部コンテンツ埋め込み (Instagram, Note, X)
    stamp-board/              #   スタンプボード
    theme/                    #   テーマ
  lib/                        # 共有ライブラリ
    constants/                #   定数 (色, 施設アイコン, 祝日, 位置, ターゲットタグ, ハンターレベル)
    contexts/                 #   Reactコンテキスト (loading, feedback)
    data/                     #   静的データ (避難所)
    hooks/                    #   カスタムフック (geolocation, GTFS, places, supabase-spots, toast)
    seo/                      #   SEOユーティリティ (metadata, URL helper)
    services/                 #   外部サービス (GA4, メール, アナリティクス)
    utils/                    #   ユーティリティ (距離計算, 有効期限, レート制限)
  types/                      # TypeScript型定義
  tasks/                      # タスク管理 (todo.md, lessons.md)
  scripts/                    # CLIスクリプト (GTFSインポート)
  supabase/                   # Supabase設定・Edge Functions
  public/                     # 静的アセット
```

---

## セットアップ

### 前提条件

- Node.js 18+
- npm

### インストール

```bash
git clone https://github.com/your-org/tokudoku-app.git
cd tokudoku-app
npm install
```

### 環境変数

`.env.local` を作成し、以下を設定:

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=

# Google Maps
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=

# Google Analytics 4
NEXT_PUBLIC_GA_MEASUREMENT_ID=
GOOGLE_ANALYTICS_PROPERTY_ID=

# NextAuth
NEXTAUTH_SECRET=
NEXTAUTH_URL=http://localhost:3000

# Google OAuth
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=

# サービスアカウント (GA4 Data API / Google Sheets共用)
GOOGLE_SHEETS_SERVICE_ACCOUNT_KEY=

# アプリケーション
NEXT_PUBLIC_APP_URL=http://localhost:3000

# Resend (メール)
RESEND_API_KEY=
RESEND_FROM_EMAIL=
RESEND_FROM_NAME=

# LINE (任意)
LINE_CHANNEL_ACCESS_TOKEN=
LINE_CHANNEL_SECRET=
```

### 開発サーバー

```bash
npm run dev
```

http://localhost:3000 でアクセス可能。

---

## GA4 カスタムイベント

TOKODOKUのサービス特性に合わせた15種類のカスタムイベントを実装済み:

| イベント名 | トリガー | パラメータ |
|-----------|---------|-----------|
| `map_view` | マップ初期化完了 | - |
| `spot_type_filter` | スポットタイプ切替 | `spot_type` |
| `facility_detail_view` | 施設詳細表示 | `facility_type`, `facility_id` |
| `event_list_view` | イベント一覧表示 | `filter_city`, `filter_target` |
| `event_detail_view` | イベント詳細表示 | `event_id`, `event_name`, `city` |
| `event_search` | イベント検索 | `search_query`, `city`, `target` |
| `post_submit` | イベント投稿完了 | `category`, `city` |
| `review_submit` | レビュー投稿完了 | `event_id`, `rating` |
| `facility_report` | 施設レポート送信 | `facility_type` |
| `facility_vote` | 施設投票 | `facility_id`, `vote_type` |
| `feedback_submit` | フィードバック送信 | `rating` |
| `contact_submit` | お問い合わせ送信 | - |
| `login_attempt` | ログイン試行 | `method` |
| `register_attempt` | 新規登録試行 | `method` |
| `cta_click` | LP CTA クリック | `cta_name`, `page` |

実装: `lib/services/analytics.ts` の型安全な `trackEvent()` 関数。

---

## SEO・AI検索エンジン最適化

- **構造化データ(JSON-LD)**: Organization, WebSite, WebApplication, LocalBusiness, FAQ, Event, BreadcrumbList
- **AI検索ボット対応**: GPTBot, ClaudeBot, Google-Extended, PerplexityBot を明示的に許可
- **地理情報メタデータ**: 大分県全18市町村をサービスエリアとして構造化
- **サイトマップ最適化**: hourly更新頻度

---

## 今後の展望

- イベント主催者向けの管理機能強化
- イベントへの「参加表明」機能
- ユーザー間でのイベント共有機能
- プッシュ通知での新規イベント通知
- iOS / Android ネイティブアプリの開発

---

## プロジェクト情報

- 開発・運営：株式会社Nobody（代表取締役 藤原泰樹）
- URL：https://tokudoku.com
- お問い合わせ：sobota@nobody-info.com
