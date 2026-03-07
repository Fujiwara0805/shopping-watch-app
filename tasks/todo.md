# TOKODOKU Task Tracker

## Current Sprint
（なし）

## Completed
- [x] 全スポット機能完全削除（全8種のロジック + Supabaseテーブル）

## 全スポット機能削除 - 完了レポート

### Phase 1: 依存関係の整理 ✅
- [x] `getGuestProfileId` を `app/_actions/guest-profile.ts` に抽出
- [x] `event-reviews/route.ts` のimport先を変更

### Phase 2: ファイル削除 (20ファイル) ✅
- [x] hooks: use-supabase-spots, use-place-photos, use-places-search, use-gtfs-stops
- [x] API routes: spots, facility-reports, facility-votes, gtfs/*
- [x] actions: facility-reports
- [x] components: spot-selector, facility-report-form, facility-vote-buttons, bus-stop-timetable-card
- [x] data: evacuation-sites-oita
- [x] scripts: seed-spots
- [x] constants: facility-icons
- [x] types: facility-report, gtfs

### Phase 3: map-view.tsx 大規模修正 ✅
- [x] 全施設関連import削除
- [x] 全施設関連state/ref/callback/effect削除
- [x] 施設UI（SpotSelector, 詳細パネル, ゴミ箱報告）削除
- [x] 1520行 → 約470行に削減

### Phase 4: LP (app/page.tsx) + constants/index.ts 修正 ✅
- [x] `FACILITY_ICON_URLS` インポート削除
- [x] `SpotShowcaseSection` 完全削除
- [x] `SolutionSection` をイベント中心に再構成
- [x] `constants/index.ts` から facility-icons re-export 削除
- [x] 未使用lucide-reactアイコン（Layers, Users）削除

### Phase 5: Supabaseマイグレーション作成 ✅
- [x] `20260306_drop_spot_tables.sql` 作成
- [x] 12テーブル DROP: facility_votes, facility_reports, tourism_spots, onsen_spots, local_food_spots, toilet_spots, gtfs_stop_times, gtfs_trips, gtfs_routes, gtfs_calendar, gtfs_stops, gtfs_metadata

### Phase 6: ビルド検証 + mainマージ ✅
- [x] TypeScript型チェック: エラーなし
- [x] ESLint: 新規エラーなし
- [x] mainブランチにマージ完了

### 注意事項
- Supabaseマイグレーション（DROP TABLE）はまだ実行されていません。本番DBに適用する際は `supabase/migrations/20260306_drop_spot_tables.sql` を実行してください。
- `event_reviews.guest_nickname` カラムは保持（レビュー機能は継続）
