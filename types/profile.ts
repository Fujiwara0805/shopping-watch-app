export interface Profile {
  id: string; // users.id と一致
  display_name: string | null; // ニックネーム
  avatar_url: string | null;
  updated_at: string | null;
  bio: string | null; // 自己紹介
  // 必要に応じて他のプロフィール項目を追加
}

export type ProfileUpdate = Partial<Omit<Profile, 'id'>> & { updated_at?: string | null };
