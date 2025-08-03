import { PostWithAuthor } from './post';

export interface ExtendedPostWithAuthor extends PostWithAuthor {
  isLikedByCurrentUser?: boolean;
  likes_count: number;
  views_count: number;
  comments_count: number;
  remaining_items?: number;
  consumption_deadline?: string;
  distance?: number;
  author_user_id?: string;
  author_posts_count?: number;
  app_profile_id: string;
  expiry_option: "1h" | "3h" | "6h" | "12h";
  rating?: number | null;
  start_date?: string | null;
  end_date?: string | null;
  // 店舗の位置情報
  store_latitude?: number;
  store_longitude?: number;
  
  // 端末（投稿者）の位置情報（新規追加）
  user_latitude?: number;
  user_longitude?: number;
  
  // 🔥 新しいフィールドを追加
  url?: string | null;
  file_urls?: string | null; // JSON文字列
  support_purchase_enabled?: boolean;
  support_purchase_options?: string | null; // JSON文字列
  target_audience?: string | null; // 🔥 新規追加：対象者フィールド
}
