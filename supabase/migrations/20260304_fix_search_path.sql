-- ============================================================================
-- search_path 修正（緊急修正）
-- 日付: 2026-03-04
-- 原因: search_path = '' だとテーブルがスキーマ修飾なしで解決できない
-- 修正: search_path = 'public' に変更
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
      'ALTER FUNCTION %I.%I(%s) SET search_path = ''public''',
      r.nspname, r.proname, r.args
    );
    RAISE NOTICE 'Fixed search_path for %.%(%)', r.nspname, r.proname, r.args;
  END LOOP;
END $$;
