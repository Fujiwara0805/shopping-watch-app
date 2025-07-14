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
  store_latitude?: number;
  store_longitude?: number;
}
