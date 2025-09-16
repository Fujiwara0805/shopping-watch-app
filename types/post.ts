export interface Post {
  id: string;
  app_profile_id: string;
  store_id: string | null;
  store_name: string | null;
  category: string | null; 
  content: string;
  image_urls: string | null; // JSON文字列
  rating?: number | null;
  expiry_option: '15m' | '30m' | '45m' | '60m' | 'custom';
  custom_expiry_minutes?: number | null;
  created_at: string;
  expires_at?: string;
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
  support_purchase_enabled?: boolean;
  support_purchase_options?: string | null; // JSON文字列
  author_role?: string;
  
  // 🔥 新規追加フィールド
  remaining_slots?: number | null; // 残りの数（席、在庫）
  coupon_code?: string | null; // クーポン
  customer_situation?: string | null; // 来客状況
}

export interface AuthorProfile {
  display_name: string | null;
  avatar_url: string | null;
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