-- =============================================================
-- マイグレーション: 全スポット関連テーブル削除
--
-- 全8種のスポット機能（観光、グルメ、温泉、トイレ、バス停、
-- 駅、避難所、ゴミ箱）のロジックをアプリから削除したため、
-- 関連するSupabaseテーブルもすべて削除する。
--
-- 削除対象:
--   - facility_votes (ゴミ箱確認投票)
--   - facility_reports (ゴミ箱報告) ※image_urlsカラム含む
--   - tourism_spots (観光スポット)
--   - onsen_spots (温泉スポット)
--   - local_food_spots (グルメスポット)
--   - toilet_spots (トイレスポット)
--   - gtfs_stop_times (バス時刻表)
--   - gtfs_trips (バストリップ)
--   - gtfs_routes (バス路線)
--   - gtfs_calendar (バス運行カレンダー)
--   - gtfs_stops (バス停)
--   - gtfs_metadata (GTFSメタデータ)
--
-- 注意: event_reviews.guest_nickname カラムは残す（レビュー機能は継続）
-- =============================================================

-- FK依存順に削除（子テーブル → 親テーブル）

-- ゴミ箱関連
DROP TABLE IF EXISTS facility_votes CASCADE;
DROP TABLE IF EXISTS facility_reports CASCADE;

-- スポットテーブル
DROP TABLE IF EXISTS tourism_spots CASCADE;
DROP TABLE IF EXISTS onsen_spots CASCADE;
DROP TABLE IF EXISTS local_food_spots CASCADE;
DROP TABLE IF EXISTS toilet_spots CASCADE;

-- GTFSテーブル（FK依存順）
DROP TABLE IF EXISTS gtfs_stop_times CASCADE;
DROP TABLE IF EXISTS gtfs_trips CASCADE;
DROP TABLE IF EXISTS gtfs_routes CASCADE;
DROP TABLE IF EXISTS gtfs_calendar CASCADE;
DROP TABLE IF EXISTS gtfs_stops CASCADE;
DROP TABLE IF EXISTS gtfs_metadata CASCADE;
