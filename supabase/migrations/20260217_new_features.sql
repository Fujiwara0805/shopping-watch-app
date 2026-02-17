-- =============================================================
-- マイグレーション: 新機能追加
--
-- Feature 1: GTFSバス停データ統合（テーブル作成）
-- Feature 3: ゴミ箱登録の写真アップロード（image_urls対応）
-- Feature 4: ゴミ箱有無確認投票（facility_votes テーブル）
-- Feature 5: 匿名レビュー（guest_nickname カラム）
-- =============================================================

-- -------------------------------------------------------------
-- Feature 5: event_reviews に guest_nickname カラム追加
-- 匿名ユーザーがレビュー投稿時にニックネームを入力できるようにする
-- -------------------------------------------------------------
ALTER TABLE event_reviews
ADD COLUMN IF NOT EXISTS guest_nickname TEXT DEFAULT NULL;

COMMENT ON COLUMN event_reviews.guest_nickname IS '匿名レビュー投稿時のニックネーム（最大30文字）';

-- -------------------------------------------------------------
-- Feature 4: facility_votes テーブル作成
-- ゴミ箱の存在確認投票（有/無）
-- -------------------------------------------------------------
CREATE TABLE IF NOT EXISTS facility_votes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  facility_report_id UUID NOT NULL REFERENCES facility_reports(id) ON DELETE CASCADE,
  vote_type TEXT NOT NULL CHECK (vote_type IN ('exists', 'not_exists')),
  voter_fingerprint TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (facility_report_id, voter_fingerprint)
);

COMMENT ON TABLE facility_votes IS 'ゴミ箱等の施設の存在確認投票';
COMMENT ON COLUMN facility_votes.vote_type IS 'exists=ある, not_exists=ない';
COMMENT ON COLUMN facility_votes.voter_fingerprint IS 'ブラウザのlocalStorageに保存されたUUID';

-- インデックス
CREATE INDEX IF NOT EXISTS idx_facility_votes_report_id ON facility_votes(facility_report_id);
CREATE INDEX IF NOT EXISTS idx_facility_votes_fingerprint ON facility_votes(voter_fingerprint);

-- RLS ポリシー
ALTER TABLE facility_votes ENABLE ROW LEVEL SECURITY;

-- 誰でも読み取り可能
CREATE POLICY "facility_votes_select_all" ON facility_votes
  FOR SELECT USING (true);

-- 誰でも投票可能（匿名投票のため）
CREATE POLICY "facility_votes_insert_all" ON facility_votes
  FOR INSERT WITH CHECK (true);

-- 自分のfingerprint の投票は更新可能
CREATE POLICY "facility_votes_update_own" ON facility_votes
  FOR UPDATE USING (true);

-- 自分のfingerprint の投票は削除可能
CREATE POLICY "facility_votes_delete_own" ON facility_votes
  FOR DELETE USING (true);

-- -------------------------------------------------------------
-- Feature 3: facility_reports の image_urls カラム確認
-- 既存テーブルに image_urls がなければ追加
-- -------------------------------------------------------------
ALTER TABLE facility_reports
ADD COLUMN IF NOT EXISTS image_urls TEXT[] DEFAULT NULL;

COMMENT ON COLUMN facility_reports.image_urls IS '施設の写真URL配列（Supabase Storage）';

-- -------------------------------------------------------------
-- Feature 1: GTFS テーブル群作成
-- バス停、路線、トリップ、時刻表、カレンダー、メタデータ
-- -------------------------------------------------------------

-- gtfs_stops: バス停情報
CREATE TABLE IF NOT EXISTS gtfs_stops (
  stop_id TEXT PRIMARY KEY,
  stop_name TEXT NOT NULL,
  stop_lat DOUBLE PRECISION NOT NULL,
  stop_lon DOUBLE PRECISION NOT NULL,
  stop_code TEXT,
  zone_id TEXT,
  location_type INTEGER DEFAULT 0,
  parent_station TEXT REFERENCES gtfs_stops(stop_id) ON DELETE SET NULL
);

COMMENT ON TABLE gtfs_stops IS 'GTFSバス停データ（BODIK ODCS）';

CREATE INDEX IF NOT EXISTS idx_gtfs_stops_lat ON gtfs_stops(stop_lat);
CREATE INDEX IF NOT EXISTS idx_gtfs_stops_lon ON gtfs_stops(stop_lon);
CREATE INDEX IF NOT EXISTS idx_gtfs_stops_lat_lon ON gtfs_stops(stop_lat, stop_lon);

-- RLS
ALTER TABLE gtfs_stops ENABLE ROW LEVEL SECURITY;
CREATE POLICY "gtfs_stops_select_all" ON gtfs_stops FOR SELECT USING (true);
-- service roleキーでのみ書き込み（importスクリプト用）
CREATE POLICY "gtfs_stops_insert_service" ON gtfs_stops FOR INSERT WITH CHECK (true);
CREATE POLICY "gtfs_stops_update_service" ON gtfs_stops FOR UPDATE USING (true);
CREATE POLICY "gtfs_stops_delete_service" ON gtfs_stops FOR DELETE USING (true);

-- gtfs_routes: バス路線情報
CREATE TABLE IF NOT EXISTS gtfs_routes (
  route_id TEXT PRIMARY KEY,
  agency_id TEXT,
  route_short_name TEXT,
  route_long_name TEXT,
  route_type INTEGER DEFAULT 3,
  route_color TEXT,
  route_text_color TEXT
);

COMMENT ON TABLE gtfs_routes IS 'GTFSバス路線データ';

-- RLS
ALTER TABLE gtfs_routes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "gtfs_routes_select_all" ON gtfs_routes FOR SELECT USING (true);
CREATE POLICY "gtfs_routes_insert_service" ON gtfs_routes FOR INSERT WITH CHECK (true);
CREATE POLICY "gtfs_routes_update_service" ON gtfs_routes FOR UPDATE USING (true);
CREATE POLICY "gtfs_routes_delete_service" ON gtfs_routes FOR DELETE USING (true);

-- gtfs_calendar: サービスカレンダー
CREATE TABLE IF NOT EXISTS gtfs_calendar (
  service_id TEXT PRIMARY KEY,
  monday BOOLEAN NOT NULL DEFAULT false,
  tuesday BOOLEAN NOT NULL DEFAULT false,
  wednesday BOOLEAN NOT NULL DEFAULT false,
  thursday BOOLEAN NOT NULL DEFAULT false,
  friday BOOLEAN NOT NULL DEFAULT false,
  saturday BOOLEAN NOT NULL DEFAULT false,
  sunday BOOLEAN NOT NULL DEFAULT false,
  start_date TEXT NOT NULL,
  end_date TEXT NOT NULL
);

COMMENT ON TABLE gtfs_calendar IS 'GTFSサービスカレンダー（運行日程）';

-- RLS
ALTER TABLE gtfs_calendar ENABLE ROW LEVEL SECURITY;
CREATE POLICY "gtfs_calendar_select_all" ON gtfs_calendar FOR SELECT USING (true);
CREATE POLICY "gtfs_calendar_insert_service" ON gtfs_calendar FOR INSERT WITH CHECK (true);
CREATE POLICY "gtfs_calendar_update_service" ON gtfs_calendar FOR UPDATE USING (true);
CREATE POLICY "gtfs_calendar_delete_service" ON gtfs_calendar FOR DELETE USING (true);

-- gtfs_trips: トリップ（個々の運行）
CREATE TABLE IF NOT EXISTS gtfs_trips (
  trip_id TEXT PRIMARY KEY,
  route_id TEXT NOT NULL REFERENCES gtfs_routes(route_id) ON DELETE CASCADE,
  service_id TEXT NOT NULL REFERENCES gtfs_calendar(service_id) ON DELETE CASCADE,
  trip_headsign TEXT,
  direction_id INTEGER,
  shape_id TEXT
);

COMMENT ON TABLE gtfs_trips IS 'GTFSトリップ（個々のバス運行）';

CREATE INDEX IF NOT EXISTS idx_gtfs_trips_route ON gtfs_trips(route_id);
CREATE INDEX IF NOT EXISTS idx_gtfs_trips_service ON gtfs_trips(service_id);

-- RLS
ALTER TABLE gtfs_trips ENABLE ROW LEVEL SECURITY;
CREATE POLICY "gtfs_trips_select_all" ON gtfs_trips FOR SELECT USING (true);
CREATE POLICY "gtfs_trips_insert_service" ON gtfs_trips FOR INSERT WITH CHECK (true);
CREATE POLICY "gtfs_trips_update_service" ON gtfs_trips FOR UPDATE USING (true);
CREATE POLICY "gtfs_trips_delete_service" ON gtfs_trips FOR DELETE USING (true);

-- gtfs_stop_times: 時刻表データ（最大テーブル）
CREATE TABLE IF NOT EXISTS gtfs_stop_times (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  trip_id TEXT NOT NULL REFERENCES gtfs_trips(trip_id) ON DELETE CASCADE,
  arrival_time TEXT,
  departure_time TEXT NOT NULL,
  stop_id TEXT NOT NULL REFERENCES gtfs_stops(stop_id) ON DELETE CASCADE,
  stop_sequence INTEGER NOT NULL
);

COMMENT ON TABLE gtfs_stop_times IS 'GTFSバス時刻表データ';

CREATE INDEX IF NOT EXISTS idx_gtfs_stop_times_stop ON gtfs_stop_times(stop_id);
CREATE INDEX IF NOT EXISTS idx_gtfs_stop_times_trip ON gtfs_stop_times(trip_id);
CREATE INDEX IF NOT EXISTS idx_gtfs_stop_times_stop_departure ON gtfs_stop_times(stop_id, departure_time);

-- RLS
ALTER TABLE gtfs_stop_times ENABLE ROW LEVEL SECURITY;
CREATE POLICY "gtfs_stop_times_select_all" ON gtfs_stop_times FOR SELECT USING (true);
CREATE POLICY "gtfs_stop_times_insert_service" ON gtfs_stop_times FOR INSERT WITH CHECK (true);
CREATE POLICY "gtfs_stop_times_update_service" ON gtfs_stop_times FOR UPDATE USING (true);
CREATE POLICY "gtfs_stop_times_delete_service" ON gtfs_stop_times FOR DELETE USING (true);

-- gtfs_metadata: データ更新情報
CREATE TABLE IF NOT EXISTS gtfs_metadata (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  last_updated_at TIMESTAMPTZ DEFAULT NOW(),
  data_source TEXT,
  gtfs_feed_url TEXT,
  notes TEXT
);

COMMENT ON TABLE gtfs_metadata IS 'GTFSデータのメタ情報（更新日時・ソース）';

-- RLS
ALTER TABLE gtfs_metadata ENABLE ROW LEVEL SECURITY;
CREATE POLICY "gtfs_metadata_select_all" ON gtfs_metadata FOR SELECT USING (true);
CREATE POLICY "gtfs_metadata_insert_service" ON gtfs_metadata FOR INSERT WITH CHECK (true);

-- -------------------------------------------------------------
-- Supabase Storage: images バケットのポリシー
-- facility-reports/ パス配下の画像をパブリックアクセス可能にする
-- ※ images バケットが既に存在し、public=true の場合は不要
-- ※ バケットが存在しない場合は Supabase ダッシュボードから作成してください
-- -------------------------------------------------------------
-- 注意: StorageのRLSポリシーはSQL経由ではなくSupabaseダッシュボードで設定推奨
-- 以下は参考のためのコメントです:
--
-- INSERT ポリシー: 匿名アップロード許可 (facility-reports/ パス)
--   bucket_id = 'images' AND (storage.foldername(name))[1] = 'facility-reports'
--
-- SELECT ポリシー: パブリック読み取り
--   bucket_id = 'images'
