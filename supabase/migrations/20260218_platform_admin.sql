-- プラットフォーム管理コンソール用マイグレーション
-- admin_users にプラットフォームロール追加、テナント拡張、請求テーブル作成、noname初期データ

-- 1. admin_users にプラットフォームロール追加
ALTER TABLE admin_users ADD COLUMN IF NOT EXISTS platform_role TEXT DEFAULT 'tenant_admin';
CREATE INDEX IF NOT EXISTS idx_admin_users_platform_role ON admin_users(platform_role);

-- 2. tenants テーブル拡張
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS logo_url TEXT;
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS contact_email TEXT;
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS contact_phone TEXT;
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS address TEXT;
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS notes TEXT;

-- 3. テナント契約プラン
CREATE TABLE IF NOT EXISTS tenant_plans (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE UNIQUE,
  plan_name TEXT NOT NULL DEFAULT 'standard',
  monthly_fee INT NOT NULL DEFAULT 50000,
  setup_fee INT DEFAULT 300000,
  started_at TIMESTAMPTZ DEFAULT now(),
  next_billing_at TIMESTAMPTZ,
  status TEXT DEFAULT 'active',
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_tenant_plans_tenant ON tenant_plans(tenant_id);
CREATE INDEX IF NOT EXISTS idx_tenant_plans_status ON tenant_plans(status);

ALTER TABLE tenant_plans ENABLE ROW LEVEL SECURITY;
CREATE POLICY "service_role_only_tenant_plans" ON tenant_plans
  FOR ALL USING (current_setting('role') = 'service_role');

-- 4. 請求書テーブル
CREATE TABLE IF NOT EXISTS billing_invoices (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  plan_id UUID REFERENCES tenant_plans(id),
  amount INT NOT NULL,
  tax_amount INT DEFAULT 0,
  billing_period_start DATE,
  billing_period_end DATE,
  status TEXT DEFAULT 'pending',
  paid_at TIMESTAMPTZ,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_billing_invoices_tenant ON billing_invoices(tenant_id);
CREATE INDEX IF NOT EXISTS idx_billing_invoices_status ON billing_invoices(status);
CREATE INDEX IF NOT EXISTS idx_billing_invoices_created ON billing_invoices(created_at DESC);

ALTER TABLE billing_invoices ENABLE ROW LEVEL SECURITY;
CREATE POLICY "service_role_only_billing_invoices" ON billing_invoices
  FOR ALL USING (current_setting('role') = 'service_role');

-- 5. プラットフォーム設定テーブル
CREATE TABLE IF NOT EXISTS platform_settings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  key TEXT UNIQUE NOT NULL,
  value TEXT NOT NULL,
  description TEXT,
  updated_by UUID REFERENCES admin_users(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE platform_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "service_role_only_platform_settings" ON platform_settings
  FOR ALL USING (current_setting('role') = 'service_role');

-- 初期設定データ
INSERT INTO platform_settings (key, value, description) VALUES
  ('maintenance_mode', 'false', 'グローバルメンテナンスモード'),
  ('maintenance_message', 'メンテナンス中です。しばらくお待ちください。', 'メンテナンスメッセージ'),
  ('default_plan', 'standard', 'デフォルトプラン'),
  ('default_monthly_fee', '50000', 'デフォルト月額（円）'),
  ('default_setup_fee', '300000', 'デフォルト初期費用（円）'),
  ('support_email', 'support@l-ope.jp', 'サポートメールアドレス'),
  ('service_name', 'Lオペ for CLINIC', 'サービス名')
ON CONFLICT (key) DO NOTHING;

-- 6. noname テナント作成 + 既存データ紐付け
INSERT INTO tenants (id, slug, name, is_active)
VALUES ('00000000-0000-0000-0000-000000000001', 'noname', 'noname beauty clinic', true)
ON CONFLICT (slug) DO NOTHING;

-- 既存 admin_users を noname テナントに紐付け
UPDATE admin_users SET tenant_id = '00000000-0000-0000-0000-000000000001'
WHERE tenant_id IS NULL;

-- 既存管理者を platform_admin に昇格
UPDATE admin_users SET platform_role = 'platform_admin'
WHERE tenant_id = '00000000-0000-0000-0000-000000000001';

-- tenant_members に登録
INSERT INTO tenant_members (tenant_id, admin_user_id, role)
SELECT '00000000-0000-0000-0000-000000000001', id, 'owner'
FROM admin_users
WHERE tenant_id = '00000000-0000-0000-0000-000000000001'
ON CONFLICT (tenant_id, admin_user_id) DO NOTHING;

-- noname テナントの契約プラン
INSERT INTO tenant_plans (tenant_id, plan_name, monthly_fee, setup_fee, status)
VALUES ('00000000-0000-0000-0000-000000000001', 'standard', 50000, 0, 'active')
ON CONFLICT (tenant_id) DO NOTHING;

-- 7. 全テーブルの tenant_id=NULL を noname に紐付け
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
    'booking_open_settings', 'password_reset_tokens',
    'shipping_shares', 'karte_images', 'karte_templates', 'monthly_financials',
    'media', 'products', 'tenant_settings',
    'admin_sessions', 'coupons', 'coupon_issues',
    'intake_form_definitions', 'reminder_rules', 'reminder_sent_log',
    'line_daily_stats', 'nps_surveys', 'nps_responses',
    'inventory_logs', 'audit_logs', 'bank_transfer_orders'
  ];
  t TEXT;
BEGIN
  FOREACH t IN ARRAY tables LOOP
    BEGIN
      EXECUTE format(
        'UPDATE %I SET tenant_id = ''00000000-0000-0000-0000-000000000001'' WHERE tenant_id IS NULL',
        t
      );
    EXCEPTION WHEN undefined_table THEN
      -- テーブルが存在しない場合はスキップ
      NULL;
    WHEN undefined_column THEN
      -- tenant_id カラムが存在しない場合はスキップ
      NULL;
    END;
  END LOOP;
END $$;
