export interface Store {
  id: string;
  name: string;
  address: string;
  latitude: number;
  longitude: number;
  openStatus: 'open' | 'closed';
  openingHours: string;
  phone: string;
  distance: number;
  hasDiscount: boolean;
  posts: number;
}