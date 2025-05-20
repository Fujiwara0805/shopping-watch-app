export interface Post {
  id: string;
  author: {
    id: string;
    name: string;
    avatar: string;
  };
  storeId: string;
  storeName: string;
  category: string;
  content: string;
  image?: string | null;
  discountRate: number;
  expiryOption: '1h' | '3h' | '24h';
  createdAt: number;
  expiresAt: number;
  likesCount: number;
}