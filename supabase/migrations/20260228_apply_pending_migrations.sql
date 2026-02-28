-- 20260228_apply_pending_migrations.sql
-- 05c2307 (機能拡充ロードマップ) で追加されたが未適用だったマイグレーションを一括適用
-- 対象: ab_tests, workflows, google_calendar, form_display_conditions, RLS強化

-- ============================================================================
-- 1. ABテスト管理テーブル (20260227170000)
-- ============================================================================

CREATE TABLE IF NOT EXISTS ab_tests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  name TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'draft',
  target_segment TEXT,
  target_count INTEGER NOT NULL DEFAULT 0,
  winner_variant_id UUID,
  winner_criteria TEXT NOT NULL DEFAULT 'open_rate',
  auto_select_winner BOOLEAN NOT NULL DEFAULT true,
  min_sample_size INTEGER NOT NULL DEFAULT 100,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS ab_test_variants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ab_test_id UUID NOT NULL REFERENCES ab_tests(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  template_id UUID,
  message_content TEXT,
  message_type TEXT NOT NULL DEFAULT 'text',
  allocation_ratio NUMERIC NOT NULL DEFAULT 50,
  sent_count INTEGER NOT NULL DEFAULT 0,
  open_count INTEGER NOT NULL DEFAULT 0,
  click_count INTEGER NOT NULL DEFAULT 0,
  conversion_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE ab_tests ENABLE ROW LEVEL SECURITY;
ALTER TABLE ab_test_variants ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  CREATE POLICY "service_role_only" ON ab_tests FOR ALL USING (auth.role() = 'service_role');
  EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
  CREATE POLICY "service_role_only" ON ab_test_variants FOR ALL USING (auth.role() = 'service_role');
  EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE INDEX IF NOT EXISTS idx_ab_tests_tenant_id ON ab_tests(tenant_id);
CREATE INDEX IF NOT EXISTS idx_ab_tests_status ON ab_tests(status);
CREATE INDEX IF NOT EXISTS idx_ab_test_variants_ab_test_id ON ab_test_variants(ab_test_id);

-- ============================================================================
-- 2. ワークフロー自動化テーブル (20260227190000)
-- ============================================================================

CREATE TABLE IF NOT EXISTS workflows (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  name TEXT NOT NULL,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'draft',
  trigger_type TEXT NOT NULL,
  trigger_config JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS workflow_steps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workflow_id UUID NOT NULL REFERENCES workflows(id) ON DELETE CASCADE,
  sort_order INTEGER NOT NULL DEFAULT 0,
  step_type TEXT NOT NULL,
  config JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS workflow_executions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workflow_id UUID NOT NULL REFERENCES workflows(id),
  patient_id UUID,
  status TEXT NOT NULL DEFAULT 'running',
  trigger_data JSONB,
  current_step INTEGER NOT NULL DEFAULT 0,
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ,
  error TEXT
);

ALTER TABLE workflows ENABLE ROW LEVEL SECURITY;
ALTER TABLE workflow_steps ENABLE ROW LEVEL SECURITY;
ALTER TABLE workflow_executions ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  CREATE POLICY "service_role_only" ON workflows FOR ALL USING (auth.role() = 'service_role');
  EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
  CREATE POLICY "service_role_only" ON workflow_steps FOR ALL USING (auth.role() = 'service_role');
  EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
  CREATE POLICY "service_role_only" ON workflow_executions FOR ALL USING (auth.role() = 'service_role');
  EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE INDEX IF NOT EXISTS idx_workflows_tenant_id ON workflows(tenant_id);
CREATE INDEX IF NOT EXISTS idx_workflows_status ON workflows(status);
CREATE INDEX IF NOT EXISTS idx_workflow_steps_workflow_id ON workflow_steps(workflow_id);
CREATE INDEX IF NOT EXISTS idx_workflow_executions_workflow_id ON workflow_executions(workflow_id);
CREATE INDEX IF NOT EXISTS idx_workflow_executions_patient_id ON workflow_executions(patient_id);
CREATE INDEX IF NOT EXISTS idx_workflow_executions_status ON workflow_executions(status);

-- ============================================================================
-- 3. Google Calendar連携カラム追加 (20260227180000)
-- ============================================================================

ALTER TABLE doctors ADD COLUMN IF NOT EXISTS google_calendar_id TEXT;
ALTER TABLE doctors ADD COLUMN IF NOT EXISTS google_access_token TEXT;
ALTER TABLE doctors ADD COLUMN IF NOT EXISTS google_refresh_token TEXT;
ALTER TABLE doctors ADD COLUMN IF NOT EXISTS google_token_expires_at TIMESTAMPTZ;

-- ============================================================================
-- 4. フォーム表示条件 (20260227160000)
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_forms_fields_gin ON forms USING gin (fields);

-- ============================================================================
-- 5. RLSポリシー強化 (20260227150000)
-- ============================================================================

-- グループC: 既存ポリシーの修正
DROP POLICY IF EXISTS "tenant_options_select" ON tenant_options;
DROP POLICY IF EXISTS "tenant_options_insert" ON tenant_options;
DROP POLICY IF EXISTS "tenant_options_update" ON tenant_options;
DO $$ BEGIN
  CREATE POLICY "service_role_full_access_tenant_options" ON tenant_options
    FOR ALL USING (auth.role() = 'service_role');
  EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DROP POLICY IF EXISTS "monthly_usage_select" ON monthly_usage;
DROP POLICY IF EXISTS "monthly_usage_insert" ON monthly_usage;
DROP POLICY IF EXISTS "monthly_usage_update" ON monthly_usage;
DO $$ BEGIN
  CREATE POLICY "service_role_full_access_monthly_usage" ON monthly_usage
    FOR ALL USING (auth.role() = 'service_role');
  EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DROP POLICY IF EXISTS "authenticated_read" ON patient_segments;
DROP POLICY IF EXISTS "service_role_all" ON patient_segments;
DO $$ BEGIN
  CREATE POLICY "service_role_full_access_patient_segments" ON patient_segments
    FOR ALL USING (auth.role() = 'service_role');
  EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DROP POLICY IF EXISTS "Users can view their own bank transfer orders" ON bank_transfer_orders;
DROP POLICY IF EXISTS "Allow all inserts" ON bank_transfer_orders;
DROP POLICY IF EXISTS "Service role can update bank transfer orders" ON bank_transfer_orders;
DROP POLICY IF EXISTS "Service role can delete bank transfer orders" ON bank_transfer_orders;
DO $$ BEGIN
  CREATE POLICY "service_role_full_access_bank_transfer_orders" ON bank_transfer_orders
    FOR ALL USING (auth.role() = 'service_role');
  EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DROP POLICY IF EXISTS "Enable read access for all users" ON patients;
DROP POLICY IF EXISTS "Enable insert for anon users" ON patients;
DROP POLICY IF EXISTS "Enable update for anon users" ON patients;

-- グループA: 患者関連テーブル（service_role + anon tenant-based）
ALTER TABLE patients ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  CREATE POLICY "service_role_full_access_patients" ON patients
    FOR ALL USING (auth.role() = 'service_role');
  EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
  CREATE POLICY "anon_tenant_access_patients" ON patients
    FOR ALL USING (tenant_id = current_setting('app.current_tenant_id', true)::uuid)
    WITH CHECK (tenant_id = current_setting('app.current_tenant_id', true)::uuid);
  EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

ALTER TABLE intake ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  CREATE POLICY "service_role_full_access_intake" ON intake
    FOR ALL USING (auth.role() = 'service_role');
  EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
  CREATE POLICY "anon_tenant_access_intake" ON intake
    FOR ALL USING (tenant_id = current_setting('app.current_tenant_id', true)::uuid)
    WITH CHECK (tenant_id = current_setting('app.current_tenant_id', true)::uuid);
  EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  CREATE POLICY "service_role_full_access_orders" ON orders
    FOR ALL USING (auth.role() = 'service_role');
  EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
  CREATE POLICY "anon_tenant_access_orders" ON orders
    FOR ALL USING (tenant_id = current_setting('app.current_tenant_id', true)::uuid)
    WITH CHECK (tenant_id = current_setting('app.current_tenant_id', true)::uuid);
  EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

ALTER TABLE reservations ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  CREATE POLICY "service_role_full_access_reservations" ON reservations
    FOR ALL USING (auth.role() = 'service_role');
  EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
  CREATE POLICY "anon_tenant_access_reservations" ON reservations
    FOR ALL USING (tenant_id = current_setting('app.current_tenant_id', true)::uuid)
    WITH CHECK (tenant_id = current_setting('app.current_tenant_id', true)::uuid);
  EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

ALTER TABLE reorders ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  CREATE POLICY "service_role_full_access_reorders" ON reorders
    FOR ALL USING (auth.role() = 'service_role');
  EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
  CREATE POLICY "anon_tenant_access_reorders" ON reorders
    FOR ALL USING (tenant_id = current_setting('app.current_tenant_id', true)::uuid)
    WITH CHECK (tenant_id = current_setting('app.current_tenant_id', true)::uuid);
  EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- グループB: 管理画面専用テーブル（service_role only）
ALTER TABLE doctors ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  CREATE POLICY "service_role_full_access_doctors" ON doctors
    FOR ALL USING (auth.role() = 'service_role');
  EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

ALTER TABLE doctor_weekly_rules ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  CREATE POLICY "service_role_full_access_doctor_weekly_rules" ON doctor_weekly_rules
    FOR ALL USING (auth.role() = 'service_role');
  EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

ALTER TABLE doctor_date_overrides ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  CREATE POLICY "service_role_full_access_doctor_date_overrides" ON doctor_date_overrides
    FOR ALL USING (auth.role() = 'service_role');
  EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

ALTER TABLE booking_open_settings ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  CREATE POLICY "service_role_full_access_booking_open_settings" ON booking_open_settings
    FOR ALL USING (auth.role() = 'service_role');
  EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

ALTER TABLE products ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  CREATE POLICY "service_role_full_access_products" ON products
    FOR ALL USING (auth.role() = 'service_role');
  EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
  CREATE POLICY "anon_tenant_read_products" ON products
    FOR SELECT USING (tenant_id = current_setting('app.current_tenant_id', true)::uuid);
  EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
