export interface Post {
  id: string;
  app_profile_id: string;
  store_id: string | null;
  store_name: string | null;
  category: string | null; 
  content: string;
  image_urls: string | null; // JSON文字列
  expiry_option: '15m' | '30m' | '45m' | '60m' | '12h' | '24h' | 'days' | '90d' | 'custom';
  custom_expiry_minutes?: number | null;
  created_at: string;
  expires_at?: string | null;
  likes_count: number;
  views_count: number;
  comments_count: number;
  post_likes?: Array<{ user_id: string }>;
  
  // 店舗の位置情報
  store_latitude?: number | null;
  store_longitude?: number | null;
  location_geom?: string | null;
  
  // 端末（投稿者）の位置情報
  user_latitude?: number | null;
  user_longitude?: number | null;
  user_location_geom?: string | null;
  
  // 既存フィールド
  url?: string | null;
  file_urls?: string | null; // JSON文字列
  is_deleted?: boolean;
  author_role?: string;
  
  phone_number?: string | null;
  
  // 🔥 イベント情報フィールド
  event_name?: string | null; // イベント名
  event_start_date?: string | null; // 開催開始日
  event_end_date?: string | null; // 開催終了日
  event_price?: string | null; // 料金
  
  // 🔥 住所情報フィールド
  prefecture?: string | null; // 都道府県
  city?: string | null; // 市町村
  
  // 🔥 新規カテゴリーフィールド
  campaign?: string | null; // キャンペーン情報（旧：collaboration）
  enable_checkin?: boolean | null; // GPSチェックイン対象フラグ
  hashtags?: string[] | null; // ハッシュタグ配列
}

export interface AuthorProfile {
  display_name: string | null;
  avatar_url: string | null;
  role?: string | null; // 🔥 追加：ユーザーの役割（user, admin, business）
}

// PostWithAuthor は Post の全プロパティを持ち、さらに author オブジェクトを持つ
export interface PostWithAuthor extends Omit<Post, 'app_profile_id'> {
  author: AuthorProfile | null;
  isLikedByCurrentUser?: boolean;
}

export interface Comment {
  id: string;
  post_id: string;
  app_profile_id: string;
  parent_comment_id: string | null;
  content: string;
  created_at: string;
  updated_at: string;
  is_deleted: boolean;
  author: AuthorProfile;
  replies?: Comment[];
  likes_count: number;
  isLikedByCurrentUser?: boolean;
}