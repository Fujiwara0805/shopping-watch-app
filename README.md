# トクドク β版 🛒

みんなでお得な情報を共有するリアルタイム情報共有アプリです。近所のスーパーのお惣菜やタイムセール情報をユーザー同士で共有し、お得な買い物をサポートします。

## 📱 アプリの特徴

- **リアルタイム投稿**: スーパーのお得情報を写真付きで投稿
- **位置情報連携**: 現在地から近い店舗の情報を優先表示
- **LINE通知**: お気に入り店舗の新着情報をLINEで受信
- **いいね機能**: 気になる投稿にいいねして後で確認
- **検索・フィルター**: カテゴリ、店舗、期限などで絞り込み検索
- **PWA対応**: スマートフォンにアプリとしてインストール可能

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
- **Supabase** - BaaS（データベース、認証、ストレージ）
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
ユーザーのプロフィール情報
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
- created_at (Timestamp)
- updated_at (Timestamp)
```

#### `posts`
投稿情報
```sql
- id (UUID, Primary Key)
- app_profile_id (UUID, Foreign Key → app_profiles.id)
- store_id (String)
- store_name (String)
- category (String)
- content (Text)
- image_url (String, nullable)
- discount_rate (Integer, nullable)
- price (Integer, nullable)
- expiry_option (String) -- '1h', '3h', '6h', '12h'
- likes_count (Integer, default: 0)
- created_at (Timestamp)
- expires_at (Timestamp)
- store_latitude (Float, nullable)
- store_longitude (Float, nullable)
- location_geom (PostGIS POINT, nullable)
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
