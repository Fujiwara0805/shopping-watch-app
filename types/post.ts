export interface Post {
  id: string;
  author: {
    id: string;
    name: string;
    avatar: string;
  };
  storeName: string;
  content: string;
  image: string | null;
  category: string;
  discountRate: number;
  remainingItems: number;
  expiryTime: string | null;
  createdAt: string;
  likes: number;
  comments: number;
}