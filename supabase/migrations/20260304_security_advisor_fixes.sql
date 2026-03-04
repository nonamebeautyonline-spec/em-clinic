-- ============================================================================
-- セキュリティアドバイザー指摘事項の修正マイグレーション
-- 日付: 2026-03-04
-- 対象: ERROR 13件 + WARN 21件 + INFO 1件
-- ============================================================================

BEGIN;

-- ============================================================================
-- 1. answerers ビューの SECURITY DEFINER 修正 (ERROR)
-- ビューが作成者の権限で実行されるため、security_invoker に変更
-- ============================================================================

ALTER VIEW public.answerers SET (security_invoker = on);

-- ============================================================================
-- 2. RLS未有効テーブル11件にRLS有効化 + service_role_onlyポリシー追加 (ERROR)
-- これらのテーブルは全て supabaseAdmin (service_role) 経由でのみアクセスされる
-- ============================================================================

-- --- tenants ---
ALTER TABLE tenants ENABLE ROW LEVEL SECURITY;
CREATE POLICY "service_role_full_access_tenants" ON tenants
  FOR ALL USING (auth.role() = 'service_role');

-- --- tenant_members ---
ALTER TABLE tenant_members ENABLE ROW LEVEL SECURITY;
CREATE POLICY "service_role_full_access_tenant_members" ON tenant_members
  FOR ALL USING (auth.role() = 'service_role');

-- --- tenant_settings ---
ALTER TABLE tenant_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "service_role_full_access_tenant_settings" ON tenant_settings
  FOR ALL USING (auth.role() = 'service_role');

-- --- admin_users ---
ALTER TABLE admin_users ENABLE ROW LEVEL SECURITY;
CREATE POLICY "service_role_full_access_admin_users" ON admin_users
  FOR ALL USING (auth.role() = 'service_role');

-- --- password_reset_tokens --- (機密カラム token 露出の修正も兼ねる)
ALTER TABLE password_reset_tokens ENABLE ROW LEVEL SECURITY;
CREATE POLICY "service_role_full_access_password_reset_tokens" ON password_reset_tokens
  FOR ALL USING (auth.role() = 'service_role');

-- --- password_history ---
ALTER TABLE password_history ENABLE ROW LEVEL SECURITY;
CREATE POLICY "service_role_full_access_password_history" ON password_history
  FOR ALL USING (auth.role() = 'service_role');

-- --- shipping_shares ---
ALTER TABLE shipping_shares ENABLE ROW LEVEL SECURITY;
CREATE POLICY "service_role_full_access_shipping_shares" ON shipping_shares
  FOR ALL USING (auth.role() = 'service_role');

-- --- inventory_logs ---
ALTER TABLE inventory_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "service_role_full_access_inventory_logs" ON inventory_logs
  FOR ALL USING (auth.role() = 'service_role');

-- --- reservation_history ---
ALTER TABLE reservation_history ENABLE ROW LEVEL SECURITY;
CREATE POLICY "service_role_full_access_reservation_history" ON reservation_history
  FOR ALL USING (auth.role() = 'service_role');

-- --- security_alerts ---
ALTER TABLE security_alerts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "service_role_full_access_security_alerts" ON security_alerts
  FOR ALL USING (auth.role() = 'service_role');

-- --- webhook_events ---
ALTER TABLE webhook_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "service_role_full_access_webhook_events" ON webhook_events
  FOR ALL USING (auth.role() = 'service_role');

-- ============================================================================
-- 3. RLS Policy Always True の修正 (WARN)
-- USING(true) → service_role のみに制限
-- ============================================================================

-- --- ehr_patient_mappings: USING(true) → service_role_only ---
DROP POLICY IF EXISTS "ehr_patient_mappings_service" ON ehr_patient_mappings;
CREATE POLICY "service_role_full_access_ehr_patient_mappings" ON ehr_patient_mappings
  FOR ALL USING (auth.role() = 'service_role');

-- --- ehr_sync_logs: USING(true) → service_role_only ---
DROP POLICY IF EXISTS "ehr_sync_logs_service" ON ehr_sync_logs;
CREATE POLICY "service_role_full_access_ehr_sync_logs" ON ehr_sync_logs
  FOR ALL USING (auth.role() = 'service_role');

-- --- reservations: 旧ポリシー削除（comprehensive_rls で追加した正しいポリシーは残す）---
DROP POLICY IF EXISTS "Enable insert access for all users" ON reservations;
DROP POLICY IF EXISTS "Enable update access for all users" ON reservations;

-- ============================================================================
-- 4. medical_vocabulary に service_role_only ポリシー追加 (INFO)
-- RLS有効だがポリシーなし → 全アクセスがブロックされている状態を修正
-- ============================================================================

CREATE POLICY "service_role_full_access_medical_vocabulary" ON medical_vocabulary
  FOR ALL USING (auth.role() = 'service_role');

-- ============================================================================
-- 5. 関数の search_path 設定 (WARN)
-- search_path が未設定だとスキーマ検索パスを操作される攻撃のリスクがある
-- pg_proc から動的に全対象関数のシグネチャを取得して一括設定
-- ============================================================================

DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN
    SELECT p.oid, n.nspname, p.proname,
           pg_get_function_identity_arguments(p.oid) AS args
    FROM pg_proc p
    JOIN pg_namespace n ON p.pronamespace = n.oid
    WHERE n.nspname = 'public'
      AND p.proname IN (
        'update_answerers_updated_at',
        'delete_expired_shipping_shares',
        'update_bank_transfer_orders_updated_at',
        'record_reservation_history',
        'update_reservation_atomic',
        'get_friends_last_messages',
        'create_reservation_atomic',
        'update_friend_summary',
        'find_or_create_patient',
        'next_patient_id',
        'get_friends_list',
        'count_patients_by_tenants',
        'sum_revenue_by_tenants',
        'update_medical_vocabulary_updated_at',
        'update_updated_at_column'
      )
  LOOP
    EXECUTE format(
      'ALTER FUNCTION %I.%I(%s) SET search_path = ''''',
      r.nspname, r.proname, r.args
    );
    RAISE NOTICE 'Set search_path for %.%(%)', r.nspname, r.proname, r.args;
  END LOOP;
END $$;

COMMIT;
