export interface Notification {
  id: string;
  type: 'discount' | 'store' | 'user';
  message: string;
  read: boolean;
  timeAgo: string;
}