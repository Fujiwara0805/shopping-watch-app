export interface Store {
  id: string;
  name: string;
  address: string;
  latitude: number;
  longitude: number;
  phone: string;
  hasDiscount: boolean;
  posts: number;
  types?: string[];
}