import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const OITA_UNIVERSITY_LAT = 33.1554;
const OITA_UNIVERSITY_LON = 131.6034;
const MAX_DISTANCE_KM = 5; // 5km圏内

function degreesToRadians(degrees: number): number {
  return degrees * Math.PI / 180;
}

export function getDistanceFromLatLonInKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371; // 地球の半径（キロメートル）
  const dLat = degreesToRadians(lat2 - lat1);
  const dLon = degreesToRadians(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(degreesToRadians(lat1)) * Math.cos(degreesToRadians(lat2)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distance = R * c; // キロメートル単位での距離
  return distance;
}

export function isWithinOitaUniversityArea(lat: number | null, lon: number | null): boolean {
  if (lat === null || lon === null) {
    return false;
  }
  const distance = getDistanceFromLatLonInKm(OITA_UNIVERSITY_LAT, OITA_UNIVERSITY_LON, lat, lon);
  return distance <= MAX_DISTANCE_KM;
}
