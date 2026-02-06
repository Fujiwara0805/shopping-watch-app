// マップ内の場所の型定義
export interface MapLocation {
  order: number;
  store_id: string;
  store_name: string;
  store_latitude?: number | null;
  store_longitude?: number | null;
  content: string;
  image_urls: string[];
  url?: string | null;
}

// マップの型定義
export interface Map {
  id: string;
  title: string;
  thumbnail_url?: string | null;
  app_profile_id: string;
  locations: MapLocation[];
  hashtags?: string[] | null;
  expires_at?: string | null;
  expiry_option: '30d' | '90d' | 'unlimited';
  author_role: 'admin' | 'user';
  is_public: boolean;
  is_deleted: boolean;
  created_at: string;
  updated_at: string;
}

// コース一覧用の型定義
export interface Course {
  id: string;
  title: string;
  total_locations: number;
  cover_image_url: string | null;
  created_at: string;
  expires_at: string | null;
  hashtags: string[] | null;
}
