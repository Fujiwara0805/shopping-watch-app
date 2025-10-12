# トクドク β版 🛒

『トクドク』は、日常の買い物体験を入口に、人と情報と地域をゆるやかにつなぐ地域密着型コミュニティアプリです。
買い物メモ機能では、シンプルで使いやすいUIであることはもちろん、リストを家族や友人とワンタップで共有でき、買い忘れを防ぎながら時間とコストを削減します。
さらに、"掲示板"と呼ばれる掲示板サービスでは、商品情報の共有（例：この商品どこで売っていますか?）といったPRや、求人、商品の販売や映画の口コミまで、さまざまなジャンル・カテゴリーの投稿ができます。また、コミュニティ・地域に密着したサービスであることから、ユーザーの利用しているモバイルデバイスの現在地を取得し、現在地から1キロ圏内の投稿が表示される仕様（※閲覧範囲を変更可）となっており、また、最大12時間で投稿が自動削除されるといった仕様を備え、常に「今」必要な情報と出会えるのが特徴です。
トクドクが目指すのは、情報を必要とする人に必要な情報が届く、温かい地域社会の実現です。
買い物という身近な行動を通じて、ご近所同士が助け合い、支え合う。そんな新しいコミュニティの形を、私たちと一緒に作っていきませんか。

## 📱 アプリの特徴

トクドクは、地域のおとく情報を共有し、日常生活を豊かにする機能が満載です。

### 1. 最新情報が「とドク」！地域密着型タイムライン
- **リアルタイム投稿**: スーパーのお得情報、地域のPRなどを写真付きで手軽に投稿。
- **場所とジャンルで探す**: 投稿者の位置情報から1km圏内の情報を優先表示。ショッピング、空席情報など多彩なジャンルと詳細なカテゴリーで効率的に検索。
- **複数画像とカルーセル表示**: 最大5枚の画像を投稿でき、投稿カード内でスライド表示が可能。商品の魅力や店舗の雰囲気を詳細に伝えられます。
- **いいね・コメント・共有**: 気になる投稿には「いいね」で応援。コメントで情報交換、SNSで手軽にシェアできます。
- **お気に入り店舗通知**: 登録したお気に入り店舗に新しい投稿があると、アプリ内やLINEで通知が届き、お得情報を見逃しません。

### 2. 買い物をスマートに！共有買い物メモ
- **シンプルで使いやすい**: オフラインでも利用できる買い物リスト機能。
- **「よく買うもの」リスト**: よく購入するアイテムを登録・同期し、ワンタップでメモに追加。
- **メモ機能の強化**: 共有リストのアイテムに詳細なメモを追加可能。



### 3. 地域を繋ぐコミュニティ掲示板「掲示板」
- **生活の困りごとを解決**: 「この商品どこに売ってる？」「手伝ってくれる人いませんか？」など、地域内での情報交換や助け合いの場。
- **多様な情報発信**: PR情報、子育て相談、見た映画の感想など、幅広いトピックで地域コミュニティを活性化。

### 4. その他の便利な機能
- **プロフィール機能**: ニックネーム、アバター画像、お気に入り店舗の登録、プロフィールの完成度表示。
- **データ利活用への同意**: アプリ改善のため、個人を特定しない統計データ（年齢層、性別、居住地域など）の収集にご同意いただけます。
- **PWA対応**: スマートフォンにアプリとしてインストールし、ネイティブアプリのように利用可能。
- **洗練されたUI/UX**: Framer Motionによるスムーズなアニメーションと統一されたデザイン。

## 🛠 技術スタック

### フロントエンド
- **Next.js 14** - React フレームワーク
- **TypeScript** - 型安全な開発
- **Tailwind CSS** - ユーティリティファーストCSS
- **Framer Motion** - アニメーション
- **shadcn/ui** - UIコンポーネントライブラリ
- **React Hook Form** - フォーム管理
- **Zod** - スキーマバリデーション

### バックエンド・インフラ
- **Supabase** - BaaS（データベース、認証、ストレージ、リアルタイム）
- **PostgreSQL** - メインデータベース（PostGIS拡張）
- **NextAuth.js** - 認証システム
- **Google Maps API** - 地図・位置情報サービス
- **LINE Bot SDK** - LINE通知機能
- **Resend** - メール送信サービス

### 開発・デプロイ
- **Vercel** - ホスティング
- **ESLint** - コード品質管理
- **TypeScript** - 型チェック

## 🗄 データベース設計

### 主要テーブル

#### `app_users`
ユーザーの基本認証情報
```sql
- id (UUID, Primary Key)
- google_id (String, nullable)
- line_id (String, nullable)
- email (String, unique)
- password_hash (String, nullable)
- created_at (Timestamp)
- updated_at (Timestamp)
```

#### `app_profiles`
ユーザーのプロフィール情報とデータ利活用情報
```sql
- id (UUID, Primary Key)
- user_id (UUID, Foreign Key → app_users.id)
- display_name (String)
- avatar_url (String, nullable)
- bio (Text, nullable)
- favorite_store_1_id (String, nullable)
- favorite_store_1_name (String, nullable)
- favorite_store_2_id (String, nullable)
- favorite_store_2_name (String, nullable)
- favorite_store_3_id (String, nullable)
- favorite_store_3_name (String, nullable)
- age_group (String, nullable) -- 例: '20s', '30s', '40s', '50s', '60s_over'
- gender (String, nullable) -- 例: 'male', 'female', 'other', 'prefer_not_to_say'
- residence_area (String, nullable) -- 都道府県名など
- family_structure (String, nullable) -- 例: 'single', 'couple', 'family_with_children', 'other'
- occupation_income (String, nullable) -- 例: 'student', 'company_employee', 'housewife', 'self_employed', 'other'
- shopping_behavior (Text, nullable) -- 例: 'daily_shopping', 'weekly_bulk', 'online_shopping', 'occasionally'
- created_at (Timestamp)
- updated_at (Timestamp)
```

#### `posts`
投稿情報
```sql
- id (UUID, Primary Key)
- app_profile_id (UUID, Foreign Key → app_profiles.id)
- store_id (String, nullable)
- store_name (String, nullable)
- category (String, nullable)
- genre (String, nullable) -- 例: 'shopping', 'restaurant', 'tourism', 'leisure', 'service', 'other'
- content (Text)
- image_urls (ARRAY of Text, nullable) -- 複数画像URLの配列
- discount_rate (Integer, nullable)
- price (Integer, nullable)
- expiry_option (String) -- '1h', '3h', '6h', '12h'
- likes_count (Integer, default: 0)
- created_at (Timestamp)
- expires_at (Timestamp)
- store_latitude (Float, nullable)
- store_longitude (Float, nullable)
- location_geom (PostGIS POINT, nullable)
- user_latitude (Float, nullable) -- 投稿者の緯度
- user_longitude (Float, nullable) -- 投稿者の経度
- user_location_geom (PostGIS POINT, nullable) -- 投稿者の位置情報GEOMETRY
```

#### `post_likes`
投稿のいいね情報
```sql
- post_id (UUID, Foreign Key → posts.id)
- user_id (UUID, Foreign Key → app_users.id)
- created_at (Timestamp)
```

#### `notifications`
通知情報
```sql
- id (UUID, Primary Key)
- user_id (UUID, Foreign Key → app_profiles.id)
- type (String)
- message (Text)
- reference_post_id (UUID, nullable)
- reference_store_id (String, nullable)
- reference_store_name (String, nullable)
- is_read (Boolean, default: false)
- created_at (Timestamp)
```


## 🚀 セットアップ手順

### 1. 前提条件
- Node.js 18.0以上
- npm または yarn
- Supabaseアカウント
- Google Cloud Platformアカウント（Maps API用）
- LINEデベロッパーアカウント（通知機能用）

### 2. リポジトリのクローン
```bash
git clone <repository-url>
cd tokudoku-app
npm install
```

### 3. 環境変数の設定
`.env.local`ファイルを作成し、以下の環境変数を設定：

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key

# NextAuth.js
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=your_nextauth_secret

# Google OAuth
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret

# Google Maps API
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=your_google_maps_api_key

# LINE Bot
LINE_CLIENT_ID=your_line_client_id
LINE_CLIENT_SECRET=your_line_client_secret
LINE_CHANNEL_ACCESS_TOKEN=your_line_channel_access_token
LINE_CHANNEL_SECRET=your_line_channel_secret

# Email (Resend)
RESEND_API_KEY=your_resend_api_key

# Google Sheets (お問い合わせ用)
GOOGLE_SHEETS_ID=your_google_sheets_id
GOOGLE_SHEETS_SERVICE_ACCOUNT_KEY=your_service_account_key_json
```

### 4. Supabaseの設定

#### データベースの初期化
1. Supabaseプロジェクトを作成
2. PostGIS拡張を有効化
3. 必要なテーブルを作成
4. Row Level Security (RLS) ポリシーを設定
5. ストレージバケット（`avatars`, `images`）を作成

#### Supabase Edge Functions
```bash
# Supabase CLIをインストール
npm install -g supabase

# プロジェクトにリンク
supabase link --project-ref your_project_ref

# Edge Functionsをデプロイ
supabase functions deploy notify-favorite-store-post
```

### 5. 開発サーバーの起動
```bash
npm run dev
```

アプリケーションは `http://localhost:3000` で起動します。

## 📁 プロジェクト構造
