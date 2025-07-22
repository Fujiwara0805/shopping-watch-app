export interface Post {
  id: string;
  app_profile_id: string;
  store_id: string | null;
  store_name: string | null;
  genre: string | null;
  category: string | null;
  content: string;
  image_urls: string | null; // JSON文字列
  price: number | null;
  expiry_option: '1h' | '3h' | '6h' | '12h';
  created_at: string;
  expires_at?: string;
  likes_count: number;
  views_count: number;
  comments_count: number;
  post_likes?: Array<{ user_id: string }>;
  rating?: number | null;
  start_date?: string | null;
  end_date?: string | null;
  // 店舗の位置情報
  store_latitude?: number | null;
  store_longitude?: number | null;
  location_geom?: string | null;
  
  // 端末（投稿者）の位置情報
  user_latitude?: number | null;
  user_longitude?: number | null;
  user_location_geom?: string | null;
  
  // 新規追加フィールド
  url?: string | null;
  file_urls?: string | null; // JSON文字列

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