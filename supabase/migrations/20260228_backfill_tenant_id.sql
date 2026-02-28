-- 20260228_backfill_tenant_id.sql
-- 2/25のtenant_idカラム追加時にバックフィルが漏れていた分を補完
-- 原因: バックフィルマイグレーション(20260218)がカラム追加(20260225)より先に実行され、
--        undefined_column例外でスキップされた
-- 影響: message_log等でtenant_id=NULLのレコードが管理画面で非表示になっていた

DO $$
DECLARE
  tables TEXT[] := ARRAY[
    'patients', 'intake', 'reservations', 'orders', 'reorders',
    'message_log', 'message_templates', 'broadcasts', 'scheduled_messages',
    'rich_menus', 'tag_definitions', 'patient_tags', 'patient_marks',
    'mark_definitions', 'friend_field_definitions', 'friend_field_values',
    'friend_add_settings', 'template_categories', 'media_folders', 'media_files',
    'forms', 'form_responses', 'form_file_uploads', 'form_folders',
    'actions', 'action_folders', 'keyword_auto_replies',
    'step_scenarios', 'step_items', 'step_enrollments',
    'flex_presets', 'click_tracking_links', 'click_tracking_events',
    'chat_reads', 'doctors', 'doctor_weekly_rules', 'doctor_date_overrides',
    'booking_open_settings', 'admin_users', 'password_reset_tokens',
    'shipping_shares', 'karte_images', 'karte_templates', 'monthly_financials',
    'media', 'products', 'tenant_settings',
    'admin_sessions', 'coupons', 'coupon_issues',
    'intake_form_definitions', 'reminder_rules', 'reminder_sent_log',
    'line_daily_stats', 'nps_surveys', 'nps_responses',
    'inventory_logs', 'audit_logs', 'bank_transfer_orders'
  ];
  t TEXT;
  row_count INTEGER;
BEGIN
  FOREACH t IN ARRAY tables LOOP
    BEGIN
      EXECUTE format(
        'UPDATE %I SET tenant_id = ''00000000-0000-0000-0000-000000000001'' WHERE tenant_id IS NULL',
        t
      );
      GET DIAGNOSTICS row_count = ROW_COUNT;
      IF row_count > 0 THEN
        RAISE NOTICE 'Updated % rows in %', row_count, t;
      END IF;
    EXCEPTION
      WHEN undefined_table THEN NULL;
      WHEN undefined_column THEN NULL;
    END;
  END LOOP;
END $$;
