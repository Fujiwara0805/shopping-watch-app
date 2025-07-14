export interface Profile {
  id: string; // users.id と一致
  display_name: string | null; // ニックネーム
  avatar_url: string | null;
  updated_at: string | null;
  favorite_store_1_id?: string | null;
  favorite_store_1_name?: string | null;
  favorite_store_2_id?: string | null;
  favorite_store_2_name?: string | null;
  favorite_store_3_id?: string | null;
  favorite_store_3_name?: string | null;
  // データ利活用項目を追加
  age_group?: string | null;
  gender?: string | null;
  prefecture?: string | null;
  city?: string | null;
  family_structure?: string | null;
  children_count?: string | null;
  children_age_groups?: string[] | null;
  occupation?: string | null;
  household_income?: string | null;
  shopping_frequency?: string | null;
  primary_shopping_time?: string | null;
  average_spending?: string | null;
  shopping_style?: string | null;
  data_consent?: boolean;
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
