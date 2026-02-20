/**
 * 施設アイコン（Cloudinary）のURL定数
 */
import type { FacilityLayerType } from '@/types/facility-report';

export const FACILITY_ICON_URLS: Record<FacilityLayerType, string> = {
  hot_spring:
    'https://res.cloudinary.com/dz9trbwma/image/upload/v1771598176/%E6%B8%A9%E6%B3%89%E5%AE%BF%E3%81%AE%E6%9A%96%E7%B0%BE%E3%82%A2%E3%82%A4%E3%82%B3%E3%83%B3_axmvtb.png',
  tourism_spot:
    'https://res.cloudinary.com/dz9trbwma/image/upload/v1771598176/%E3%82%AB%E3%83%A1%E3%83%A9%E3%81%AE%E7%84%A1%E6%96%99%E3%82%A2%E3%82%A4%E3%82%B3%E3%83%B3%E7%B4%A0%E6%9D%90_8_iwkzj8.png',
  restaurant:
    'https://res.cloudinary.com/dz9trbwma/image/upload/v1771598177/%E3%83%95%E3%82%A9%E3%83%BC%E3%82%AF%E3%81%A8%E3%82%B9%E3%83%97%E3%83%BC%E3%83%B3%E3%81%AE%E9%A3%9F%E4%BA%8B%E3%81%AE%E3%82%A2%E3%82%A4%E3%82%B3%E3%83%B3%E7%B4%A0%E6%9D%90_4_l8llof.png',
  toilet:
    'https://res.cloudinary.com/dz9trbwma/image/upload/v1771598177/%E3%83%88%E3%82%A4%E3%83%AC%E3%81%AA%E3%81%A9%E3%81%A7%E4%BD%BF%E3%81%88%E3%82%8B%E7%94%B7%E5%A5%B3%E3%81%AE%E3%82%B7%E3%83%AB%E3%82%A8%E3%83%83%E3%83%88%E3%82%A2%E3%82%A4%E3%82%B3%E3%83%B3%E7%B4%A0%E6%9D%90_7_njebyg.png',
  bus_stop:
    'https://res.cloudinary.com/dz9trbwma/image/upload/v1771598177/%E3%83%90%E3%82%B9%E5%81%9C%E3%81%AE%E7%9C%8B%E6%9D%BF%E3%81%AE%E7%84%A1%E6%96%99%E3%82%A2%E3%82%A4%E3%82%B3%E3%83%B3_2_qb0vpv.png',
  train_station:
    'https://res.cloudinary.com/dz9trbwma/image/upload/v1771598177/%E9%9B%BB%E8%BB%8A%E3%81%AE%E3%82%A2%E3%82%A4%E3%82%B3%E3%83%B3%E7%B4%A0%E6%9D%90_3_cjowbh.png',
  evacuation_site:
    'https://res.cloudinary.com/dz9trbwma/image/upload/v1771598177/%E9%9D%9E%E5%B8%B8%E5%8F%A3%E3%81%AE%E3%83%9E%E3%83%BC%E3%82%AF%E3%81%AE%E3%82%A2%E3%82%A4%E3%82%B3%E3%83%B3%E7%B4%A0%E6%9D%90_4_f7i4v8.png',
  trash_can:
    'https://res.cloudinary.com/dz9trbwma/image/upload/v1771598176/%E3%82%B4%E3%83%9F%E7%AE%B1%E3%81%AE%E3%83%95%E3%83%AA%E3%83%BC%E3%82%A2%E3%82%A4%E3%82%B3%E3%83%B3%E7%B4%A0%E6%9D%90_8_qqde0x.png',
};

export const FACILITY_COLORS: Record<FacilityLayerType, string> = {
  tourism_spot: '#059669',
  restaurant: '#EA580C',
  hot_spring: '#EF4444',
  toilet: '#8B5CF6',
  bus_stop: '#3B82F6',
  train_station: '#06B6D4',
  evacuation_site: '#F59E0B',
  trash_can: '#6B7280',
};
