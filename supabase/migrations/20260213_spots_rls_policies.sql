-- ============================================================
-- spots テーブルの RLS ポリシー
-- ============================================================

-- RLS を有効化
ALTER TABLE spots ENABLE ROW LEVEL SECURITY;

-- 1. 読み取り: 誰でも is_deleted=false のスポットを閲覧可能
CREATE POLICY "spots_select_public" ON spots
  FOR SELECT
  USING (is_deleted = false);

-- 2. 挿入: 誰でも（ゲスト含む）スポットを作成可能
CREATE POLICY "spots_insert_anyone" ON spots
  FOR INSERT
  WITH CHECK (true);

-- 3. 更新: 自分が作成したスポットのみ更新可能
--    auth.uid() が app_profiles.user_id と一致するレコードのみ
CREATE POLICY "spots_update_own" ON spots
  FOR UPDATE
  USING (
    app_profile_id IN (
      SELECT id FROM app_profiles WHERE user_id = auth.uid()::text
    )
  )
  WITH CHECK (
    app_profile_id IN (
      SELECT id FROM app_profiles WHERE user_id = auth.uid()::text
    )
  );

-- 4. 削除: 自分が作成したスポットのみ削除可能（ソフトデリート）
CREATE POLICY "spots_delete_own" ON spots
  FOR DELETE
  USING (
    app_profile_id IN (
      SELECT id FROM app_profiles WHERE user_id = auth.uid()::text
    )
  );
