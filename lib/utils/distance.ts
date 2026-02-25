/**
 * 2点間の距離を計算（Haversine公式）
 * @param lat1 地点1の緯度
 * @param lon1 地点1の経度
 * @param lat2 地点2の緯度
 * @param lon2 地点2の経度
 * @returns 距離（メートル）
 */
export function calculateDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371e3; // 地球の半径（メートル）
  const φ1 = (lat1 * Math.PI) / 180;
  const φ2 = (lat2 * Math.PI) / 180;
  const Δφ = ((lat2 - lat1) * Math.PI) / 180;
  const Δλ = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c; // メートル単位
}

/**
 * 指定範囲内にいるかチェック
 * @param userLat ユーザーの緯度
 * @param userLon ユーザーの経度
 * @param targetLat 目標地点の緯度
 * @param targetLon 目標地点の経度
 * @param rangeInMeters 範囲（メートル）
 * @returns 範囲内にいる場合true
 */
export function isWithinRange(
  userLat: number,
  userLon: number,
  targetLat: number,
  targetLon: number,
  rangeInMeters: number
): boolean {
  const distance = calculateDistance(userLat, userLon, targetLat, targetLon);
  return distance <= rangeInMeters;
}

const OITA_UNIVERSITY_LAT = 33.1554;
const OITA_UNIVERSITY_LON = 131.6034;
const MAX_DISTANCE_KM = 5;

export function getDistanceFromLatLonInKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  return calculateDistance(lat1, lon1, lat2, lon2) / 1000;
}

export function isWithinOitaUniversityArea(lat: number | null, lon: number | null): boolean {
  if (lat === null || lon === null) {
    return false;
  }
  const distance = getDistanceFromLatLonInKm(OITA_UNIVERSITY_LAT, OITA_UNIVERSITY_LON, lat, lon);
  return distance <= MAX_DISTANCE_KM;
}

