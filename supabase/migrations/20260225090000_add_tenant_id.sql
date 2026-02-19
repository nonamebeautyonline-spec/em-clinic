-- Phase 4: 全テーブルに tenant_id カラムを追加（マルチテナント対応）
-- products, tenant_settings は既に対応済みのため除外
-- 初期値は NULL（既存データはシングルテナントとして扱う）

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
    'media'
  ];
  t TEXT;
BEGIN
  FOREACH t IN ARRAY tables LOOP
    BEGIN
      EXECUTE format('ALTER TABLE IF EXISTS %I ADD COLUMN IF NOT EXISTS tenant_id UUID', t);
      EXECUTE format('CREATE INDEX IF NOT EXISTS idx_%s_tenant ON %I(tenant_id)',
                     replace(t, '.', '_'), t);
    EXCEPTION WHEN undefined_table THEN
      NULL;
    END;
  END LOOP;
END $$;
