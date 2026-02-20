-- =============================================================
-- マイグレーション: 観光・グルメ・温泉・トイレ スポットテーブル
--
-- Excelデータベースから取得したスポット情報を保存するためのテーブル
-- 既存のGoogle Places API依存を自前DBデータに置き換え
-- =============================================================

-- -------------------------------------------------------------
-- tourism_spots: 観光スポット
-- -------------------------------------------------------------
CREATE TABLE IF NOT EXISTS tourism_spots (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  spot_id TEXT UNIQUE,
  spot_name TEXT NOT NULL,
  category TEXT,
  sub_categories TEXT,
  municipality TEXT,
  address TEXT,
  latitude DOUBLE PRECISION NOT NULL,
  longitude DOUBLE PRECISION NOT NULL,
  description TEXT,
  business_hours TEXT,
  closed_days TEXT,
  fee TEXT,
  phone TEXT,
  access TEXT,
  parking TEXT,
  website TEXT,
  multilingual TEXT,
  source_url TEXT,
  data_source TEXT,
  last_updated TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE tourism_spots IS '大分県内の観光スポットデータ（ツーリズムおおいた等から取得）';

CREATE INDEX IF NOT EXISTS idx_tourism_spots_lat_lon ON tourism_spots(latitude, longitude);
CREATE INDEX IF NOT EXISTS idx_tourism_spots_municipality ON tourism_spots(municipality);
CREATE INDEX IF NOT EXISTS idx_tourism_spots_category ON tourism_spots(category);

-- RLS
ALTER TABLE tourism_spots ENABLE ROW LEVEL SECURITY;
CREATE POLICY "tourism_spots_select_all" ON tourism_spots FOR SELECT USING (true);
CREATE POLICY "tourism_spots_insert_service" ON tourism_spots FOR INSERT WITH CHECK (true);
CREATE POLICY "tourism_spots_update_service" ON tourism_spots FOR UPDATE USING (true);
CREATE POLICY "tourism_spots_delete_service" ON tourism_spots FOR DELETE USING (true);

-- -------------------------------------------------------------
-- onsen_spots: 温泉スポット
-- -------------------------------------------------------------
CREATE TABLE IF NOT EXISTS onsen_spots (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  spot_id TEXT UNIQUE,
  onsen_name TEXT NOT NULL,
  municipality TEXT,
  address TEXT,
  latitude DOUBLE PRECISION NOT NULL,
  longitude DOUBLE PRECISION NOT NULL,
  spring_quality TEXT,
  facility_type TEXT,
  fee TEXT,
  business_hours TEXT,
  closed_days TEXT,
  phone TEXT,
  website TEXT,
  description TEXT,
  parking TEXT,
  access TEXT,
  source_url TEXT,
  data_source TEXT,
  last_updated TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE onsen_spots IS '大分県内の温泉スポットデータ';

CREATE INDEX IF NOT EXISTS idx_onsen_spots_lat_lon ON onsen_spots(latitude, longitude);
CREATE INDEX IF NOT EXISTS idx_onsen_spots_municipality ON onsen_spots(municipality);

-- RLS
ALTER TABLE onsen_spots ENABLE ROW LEVEL SECURITY;
CREATE POLICY "onsen_spots_select_all" ON onsen_spots FOR SELECT USING (true);
CREATE POLICY "onsen_spots_insert_service" ON onsen_spots FOR INSERT WITH CHECK (true);
CREATE POLICY "onsen_spots_update_service" ON onsen_spots FOR UPDATE USING (true);
CREATE POLICY "onsen_spots_delete_service" ON onsen_spots FOR DELETE USING (true);

-- -------------------------------------------------------------
-- local_food_spots: グルメ・食事処スポット
-- -------------------------------------------------------------
CREATE TABLE IF NOT EXISTS local_food_spots (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  spot_id TEXT UNIQUE,
  shop_name TEXT NOT NULL,
  cuisine_type TEXT,
  municipality TEXT,
  address TEXT,
  latitude DOUBLE PRECISION NOT NULL,
  longitude DOUBLE PRECISION NOT NULL,
  business_hours TEXT,
  closed_days TEXT,
  price_range TEXT,
  phone TEXT,
  website TEXT,
  description TEXT,
  parking TEXT,
  access TEXT,
  source_url TEXT,
  data_source TEXT,
  last_updated TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE local_food_spots IS '大分県内のグルメ・飲食店スポットデータ';

CREATE INDEX IF NOT EXISTS idx_local_food_spots_lat_lon ON local_food_spots(latitude, longitude);
CREATE INDEX IF NOT EXISTS idx_local_food_spots_municipality ON local_food_spots(municipality);

-- RLS
ALTER TABLE local_food_spots ENABLE ROW LEVEL SECURITY;
CREATE POLICY "local_food_spots_select_all" ON local_food_spots FOR SELECT USING (true);
CREATE POLICY "local_food_spots_insert_service" ON local_food_spots FOR INSERT WITH CHECK (true);
CREATE POLICY "local_food_spots_update_service" ON local_food_spots FOR UPDATE USING (true);
CREATE POLICY "local_food_spots_delete_service" ON local_food_spots FOR DELETE USING (true);

-- -------------------------------------------------------------
-- toilet_spots: トイレスポット
-- -------------------------------------------------------------
CREATE TABLE IF NOT EXISTS toilet_spots (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  spot_id TEXT UNIQUE,
  facility_name TEXT NOT NULL,
  municipality TEXT,
  address TEXT,
  latitude DOUBLE PRECISION NOT NULL,
  longitude DOUBLE PRECISION NOT NULL,
  toilet_type TEXT,
  barrier_free TEXT,
  business_hours TEXT,
  source_url TEXT,
  data_source TEXT,
  last_updated TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE toilet_spots IS '大分県内のトイレスポットデータ';

CREATE INDEX IF NOT EXISTS idx_toilet_spots_lat_lon ON toilet_spots(latitude, longitude);
CREATE INDEX IF NOT EXISTS idx_toilet_spots_municipality ON toilet_spots(municipality);

-- RLS
ALTER TABLE toilet_spots ENABLE ROW LEVEL SECURITY;
CREATE POLICY "toilet_spots_select_all" ON toilet_spots FOR SELECT USING (true);
CREATE POLICY "toilet_spots_insert_service" ON toilet_spots FOR INSERT WITH CHECK (true);
CREATE POLICY "toilet_spots_update_service" ON toilet_spots FOR UPDATE USING (true);
CREATE POLICY "toilet_spots_delete_service" ON toilet_spots FOR DELETE USING (true);
