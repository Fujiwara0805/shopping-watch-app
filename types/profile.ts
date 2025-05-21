export interface Profile {
  id: string; // users.id と一致
  username: string | null;
  avatar_url: string | null;
  full_name: string | null; // LINEの表示名など、必要に応じて
  updated_at: string | null;
  // 必要に応じて他のプロフィール項目を追加
}

export type ProfileUpdate = Partial<Omit<Profile, 'id'>> & { updated_at?: string | null };
