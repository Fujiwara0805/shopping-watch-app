export interface FacilityReport {
  id: string;
  facility_type: string;
  store_name: string;
  description: string | null;
  store_latitude: number;
  store_longitude: number;
  image_urls: string[] | null;
  app_profile_id: string | null;
  reporter_id: string | null;
  is_verified: boolean;
  is_deleted: boolean;
  created_at: string;
  updated_at: string;
}

export interface FacilityReportWithAuthor extends FacilityReport {
  author_name: string;
  reporter_nickname: string | null;
}

export type FacilityLayerType =
  | 'trash_can'
  | 'bus_stop'
  | 'train_station'
  | 'evacuation_site'
  | 'hot_spring'
  | 'tourism_spot'
  | 'restaurant'
  | 'toilet';

// Supabase spot types (DB-backed)
export interface TourismSpot {
  id: string;
  spot_id: string;
  spot_name: string;
  category: string | null;
  sub_categories: string | null;
  municipality: string | null;
  address: string | null;
  latitude: number;
  longitude: number;
  description: string | null;
  business_hours: string | null;
  closed_days: string | null;
  fee: string | null;
  phone: string | null;
  access: string | null;
  parking: string | null;
  website: string | null;
  source_url: string | null;
}

export interface OnsenSpot {
  id: string;
  spot_id: string;
  onsen_name: string;
  municipality: string | null;
  address: string | null;
  latitude: number;
  longitude: number;
  spring_quality: string | null;
  facility_type: string | null;
  fee: string | null;
  business_hours: string | null;
  closed_days: string | null;
  phone: string | null;
  website: string | null;
  description: string | null;
  parking: string | null;
  access: string | null;
  source_url: string | null;
}

export interface LocalFoodSpot {
  id: string;
  spot_id: string;
  shop_name: string;
  cuisine_type: string | null;
  municipality: string | null;
  address: string | null;
  latitude: number;
  longitude: number;
  business_hours: string | null;
  closed_days: string | null;
  price_range: string | null;
  phone: string | null;
  website: string | null;
  description: string | null;
  parking: string | null;
  access: string | null;
  source_url: string | null;
}

export interface ToiletSpot {
  id: string;
  spot_id: string;
  facility_name: string;
  municipality: string | null;
  address: string | null;
  latitude: number;
  longitude: number;
  toilet_type: string | null;
  barrier_free: string | null;
  business_hours: string | null;
  source_url: string | null;
}

export type SupabaseSpot = TourismSpot | OnsenSpot | LocalFoodSpot | ToiletSpot;
