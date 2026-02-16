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

export type FacilityLayerType = 'trash_can' | 'bus_stop' | 'train_station' | 'rest_spot';
