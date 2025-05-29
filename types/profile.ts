export interface Profile {
  id: string; // users.id と一致
  display_name: string | null; // ニックネーム
  avatar_url: string | null;
  updated_at: string | null;
  bio: string | null; // 自己紹介
  favorite_store_1_id?: string | null;
  favorite_store_1_name?: string | null;
  favorite_store_2_id?: string | null;
  favorite_store_2_name?: string | null;
  favorite_store_3_id?: string | null;
  favorite_store_3_name?: string | null;
  // 必要に応じて他のプロフィール項目を追加
}

export type ProfileUpdate = Partial<Omit<Profile, 'id'>> & {
  updated_at?: string | null;
  favorite_store_1_id?: string | null;
  favorite_store_1_name?: string | null;
  favorite_store_2_id?: string | null;
  favorite_store_2_name?: string | null;
  favorite_store_3_id?: string | null;
  favorite_store_3_name?: string | null;
};
