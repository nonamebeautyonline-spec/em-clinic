-- ============================================================================
-- 包括的RLSポリシー設定マイグレーション
-- 日付: 2026-02-27
-- 目的: マルチテナント対応のRLSポリシーを全テーブルに適用
-- ============================================================================
-- 設計方針:
--   1. service_role は全テーブルで無制限アクセス（管理API・Cron用）
--   2. 患者向けテーブル（グループA）は anon ユーザーに tenant_id ベースのアクセスを許可
--      → API側で SET LOCAL app.current_tenant_id = '<uuid>' を実行する前提
--   3. 管理画面専用テーブル（グループB）は service_role のみ
--   4. 既存の USING(true) ポリシー（セキュリティリスク）を service_role_only に修正
-- ============================================================================

BEGIN;

-- ============================================================================
-- グループC: 既存ポリシーの修正（先に実行）
-- tenant_options / monthly_usage の USING(true) → service_role_only
-- ============================================================================

-- tenant_options: 既存の USING(true) ポリシーを削除 → service_role_only に差し替え
DROP POLICY IF EXISTS "tenant_options_select" ON tenant_options;
DROP POLICY IF EXISTS "tenant_options_insert" ON tenant_options;
DROP POLICY IF EXISTS "tenant_options_update" ON tenant_options;

CREATE POLICY "service_role_full_access_tenant_options" ON tenant_options
  FOR ALL USING (auth.role() = 'service_role');

-- monthly_usage: 既存の USING(true) ポリシーを削除 → service_role_only に差し替え
DROP POLICY IF EXISTS "monthly_usage_select" ON monthly_usage;
DROP POLICY IF EXISTS "monthly_usage_insert" ON monthly_usage;
DROP POLICY IF EXISTS "monthly_usage_update" ON monthly_usage;

CREATE POLICY "service_role_full_access_monthly_usage" ON monthly_usage
  FOR ALL USING (auth.role() = 'service_role');

-- patient_segments: 既存の USING(true) ポリシーを削除 → service_role_only に差し替え
DROP POLICY IF EXISTS "authenticated_read" ON patient_segments;
DROP POLICY IF EXISTS "service_role_all" ON patient_segments;

CREATE POLICY "service_role_full_access_patient_segments" ON patient_segments
  FOR ALL USING (auth.role() = 'service_role');

-- bank_transfer_orders: 既存の緩いポリシーを削除 → service_role_only に差し替え
-- ※ tenant_id カラムが未追加のため、テナントベースフィルタは不可
-- ※ 全APIが supabaseAdmin (service_role) 経由なので service_role_only で十分
DROP POLICY IF EXISTS "Users can view their own bank transfer orders" ON bank_transfer_orders;
DROP POLICY IF EXISTS "Allow all inserts" ON bank_transfer_orders;
DROP POLICY IF EXISTS "Service role can update bank transfer orders" ON bank_transfer_orders;
DROP POLICY IF EXISTS "Service role can delete bank transfer orders" ON bank_transfer_orders;

CREATE POLICY "service_role_full_access_bank_transfer_orders" ON bank_transfer_orders
  FOR ALL USING (auth.role() = 'service_role');

-- patients (旧 answerers): 既存の USING(true) ポリシーを削除 → テナントベースに差し替え
DROP POLICY IF EXISTS "Enable read access for all users" ON patients;
DROP POLICY IF EXISTS "Enable insert for anon users" ON patients;
DROP POLICY IF EXISTS "Enable update for anon users" ON patients;

-- ============================================================================
-- グループA: 患者関連テーブル（anon key でのアクセスあり）
-- ポリシー:
--   - service_role: 全アクセス（FOR ALL）
--   - anon: tenant_id ベースのフィルタ（FOR ALL）
-- ============================================================================

-- --- patients ---
ALTER TABLE patients ENABLE ROW LEVEL SECURITY;

CREATE POLICY "service_role_full_access_patients" ON patients
  FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "anon_tenant_access_patients" ON patients
  FOR ALL USING (
    tenant_id = current_setting('app.current_tenant_id', true)::uuid
  )
  WITH CHECK (
    tenant_id = current_setting('app.current_tenant_id', true)::uuid
  );

-- --- intake ---
ALTER TABLE intake ENABLE ROW LEVEL SECURITY;

CREATE POLICY "service_role_full_access_intake" ON intake
  FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "anon_tenant_access_intake" ON intake
  FOR ALL USING (
    tenant_id = current_setting('app.current_tenant_id', true)::uuid
  )
  WITH CHECK (
    tenant_id = current_setting('app.current_tenant_id', true)::uuid
  );

-- --- orders ---
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "service_role_full_access_orders" ON orders
  FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "anon_tenant_access_orders" ON orders
  FOR ALL USING (
    tenant_id = current_setting('app.current_tenant_id', true)::uuid
  )
  WITH CHECK (
    tenant_id = current_setting('app.current_tenant_id', true)::uuid
  );

-- --- reservations ---
ALTER TABLE reservations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "service_role_full_access_reservations" ON reservations
  FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "anon_tenant_access_reservations" ON reservations
  FOR ALL USING (
    tenant_id = current_setting('app.current_tenant_id', true)::uuid
  )
  WITH CHECK (
    tenant_id = current_setting('app.current_tenant_id', true)::uuid
  );

-- --- reorders ---
ALTER TABLE reorders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "service_role_full_access_reorders" ON reorders
  FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "anon_tenant_access_reorders" ON reorders
  FOR ALL USING (
    tenant_id = current_setting('app.current_tenant_id', true)::uuid
  )
  WITH CHECK (
    tenant_id = current_setting('app.current_tenant_id', true)::uuid
  );

-- ============================================================================
-- グループB: LINE運用・管理画面専用テーブル（service_role のみ）
-- これらのテーブルは管理APIからのみアクセスされ、anon keyでは不要
-- ============================================================================

-- --- forms ---
-- 既にRLSが有効 + "service_role_only" ポリシーあり → 追加不要
-- （20260211_create_form_tables.sql で設定済み）

-- --- form_responses ---
-- 既にRLSが有効 + "service_role_only" ポリシーあり → 追加不要

-- --- doctors ---
ALTER TABLE doctors ENABLE ROW LEVEL SECURITY;

CREATE POLICY "service_role_full_access_doctors" ON doctors
  FOR ALL USING (auth.role() = 'service_role');

-- --- doctor_weekly_rules ---
ALTER TABLE doctor_weekly_rules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "service_role_full_access_doctor_weekly_rules" ON doctor_weekly_rules
  FOR ALL USING (auth.role() = 'service_role');

-- --- doctor_date_overrides ---
ALTER TABLE doctor_date_overrides ENABLE ROW LEVEL SECURITY;

CREATE POLICY "service_role_full_access_doctor_date_overrides" ON doctor_date_overrides
  FOR ALL USING (auth.role() = 'service_role');

-- --- booking_open_settings ---
ALTER TABLE booking_open_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "service_role_full_access_booking_open_settings" ON booking_open_settings
  FOR ALL USING (auth.role() = 'service_role');

-- --- keyword_auto_replies ---
-- 既にRLSが有効 + "service_role_only" ポリシーあり → 追加不要
-- （20260221_create_keyword_auto_replies.sql で設定済み）

-- --- products ---
ALTER TABLE products ENABLE ROW LEVEL SECURITY;

CREATE POLICY "service_role_full_access_products" ON products
  FOR ALL USING (auth.role() = 'service_role');

-- products は患者向けAPI（商品一覧取得）でも使われるため anon アクセスも許可
CREATE POLICY "anon_tenant_read_products" ON products
  FOR SELECT USING (
    tenant_id = current_setting('app.current_tenant_id', true)::uuid
  );

COMMIT;
