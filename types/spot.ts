export interface Spot {
  id: string;
  app_profile_id: string;
  store_name: string;
  description: string;
  store_latitude: number;
  store_longitude: number;
  store_id: string | null;
  image_urls: string[];
  url: string | null;
  city: string | null;
  prefecture: string;
  is_deleted: boolean;
  created_at: string;
  updated_at: string;
}

export interface SpotWithAuthor extends Spot {
  author_name: string;
  author_avatar_path: string | null;
}
