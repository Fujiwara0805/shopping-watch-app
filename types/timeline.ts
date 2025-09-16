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
  expiry_option: "15m" | "30m" | "45m" | "60m" | "custom"; // 🔥 新しい掲載期間オプション
  custom_expiry_minutes?: number | null; // 🔥 カスタム掲載時間
  rating?: number | null;
  
  // 店舗の位置情報
  store_latitude?: number;
  store_longitude?: number;
  
  // 端末（投稿者）の位置情報
  user_latitude?: number;
  user_longitude?: number;
  
  // 🔥 既存フィールド
  url?: string | null;
  file_urls?: string | null; // JSON文字列
  support_purchase_enabled?: boolean;
  support_purchase_options?: string | null; // JSON文字列
  
  // 🔥 新規追加フィールド
  remaining_slots?: number | null; // 残り枠数
  coupon_code?: string | null; // クーポン番号
  customer_situation?: string | null; // 来客状況
}
