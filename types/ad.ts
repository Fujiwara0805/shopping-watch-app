export interface Ad {
  id: string;
  title: string;
  description?: string | null;
  image_url?: string | null;
  link_url?: string | null;
  placement: 'events_list' | 'top_banner' | 'sidebar';
  priority: number;
  ad_type: 'standard' | 'google_ads' | 'affiliate';
  google_ads_id?: string | null;
  affiliate_url?: string | null;
  affiliate_id?: string | null;
  is_active: boolean;
  start_date?: string | null;
  end_date?: string | null;
  views_count: number;
  clicks_count: number;
  created_at: string;
  updated_at: string;
}

export interface AdView {
  id: string;
  ad_id: string;
  user_id?: string | null;
  viewed_at: string;
  clicked: boolean;
  clicked_at?: string | null;
}


