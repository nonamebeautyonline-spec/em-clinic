-- reservations テーブルの危険な全公開ポリシーを削除
-- USING(true) で anon key から全予約データが読み取り可能な状態だった
DROP POLICY IF EXISTS "Enable read access for all users" ON reservations;

-- service_role_full_access のロール指定も修正（public → service_role）
DROP POLICY IF EXISTS service_role_full_access_reservations ON reservations;
CREATE POLICY service_role_full_access_reservations ON reservations
  FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');
