export interface Post {
  id: string;
  app_profile_id: string; // postsテーブルの実際の外部キーカラム名
  store_id: string;
  store_name: string;
  category: string;
  content: string;
  image_url: string | null;
  discount_rate: number | null;
  price: number | null;
  expiry_option: '1h' | '3h' | '6h' | '12h';
  created_at: string;
  expires_at?: string;
  likes_count: number;
  post_likes?: Array<{ user_id: string }>;
  
  store_latitude?: number | null;
  store_longitude?: number | null;
  location_geom?: string | null; // PostGIS POINT型
}

export interface AuthorProfile {
  display_name: string | null;
  avatar_url: string | null;     // これは app_profiles テーブルの実際のカラム名に合わせてください
  // id?: string;
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