export interface Notification {
  id: string;
  user_id: string;
  type: string;
  message: string;
  reference_post_id?: string | null;
  reference_store_id?: string | null;
  reference_store_name?: string | null;
  is_read: boolean;
  created_at: string;
}