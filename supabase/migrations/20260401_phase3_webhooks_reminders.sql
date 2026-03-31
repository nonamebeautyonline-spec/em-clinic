-- Phase 3: インカミングWebhook + リマインダーテンプレート + シナリオ条件分岐強化
-- 実行: node scripts/run-sql.js supabase/migrations/20260401_phase3_webhooks_reminders.sql

-- ============================================================
-- 1. インカミングWebhookテーブル
-- ============================================================
CREATE TABLE IF NOT EXISTS incoming_webhooks (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name        VARCHAR(200) NOT NULL,
  source_type VARCHAR(100) NOT NULL,
  secret      VARCHAR(500),
  is_active   BOOLEAN DEFAULT true,
  tenant_id   UUID NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_incoming_webhooks_tenant ON incoming_webhooks (tenant_id);

ALTER TABLE incoming_webhooks ENABLE ROW LEVEL SECURITY;
CREATE POLICY service_role_full_access_incoming_webhooks ON incoming_webhooks
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

-- ============================================================
-- 2. リマインダーテンプレートテーブル
-- ============================================================
CREATE TABLE IF NOT EXISTS reminder_templates (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name       VARCHAR(200) NOT NULL,
  is_active  BOOLEAN DEFAULT true,
  tenant_id  UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_reminder_templates_tenant ON reminder_templates (tenant_id);

ALTER TABLE reminder_templates ENABLE ROW LEVEL SECURITY;
CREATE POLICY service_role_full_access_reminder_templates ON reminder_templates
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

-- ============================================================
-- 3. リマインダーステップテーブル
-- ============================================================
CREATE TABLE IF NOT EXISTS reminder_steps (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id     UUID NOT NULL REFERENCES reminder_templates(id) ON DELETE CASCADE,
  offset_minutes  INTEGER NOT NULL,
  message_type    VARCHAR(20) NOT NULL DEFAULT 'text',
  message_content TEXT NOT NULL,
  sort_order      INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS idx_reminder_steps_template ON reminder_steps (template_id);

ALTER TABLE reminder_steps ENABLE ROW LEVEL SECURITY;
CREATE POLICY service_role_full_access_reminder_steps ON reminder_steps
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

-- ============================================================
-- 4. 患者リマインダー登録テーブル
-- ============================================================
CREATE TABLE IF NOT EXISTS patient_reminders (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id  VARCHAR(50) NOT NULL,
  template_id UUID NOT NULL REFERENCES reminder_templates(id) ON DELETE CASCADE,
  target_date TIMESTAMPTZ NOT NULL,
  status      VARCHAR(20) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'completed', 'cancelled')),
  tenant_id   UUID NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_patient_reminders_tenant ON patient_reminders (tenant_id);
CREATE INDEX IF NOT EXISTS idx_patient_reminders_status ON patient_reminders (status);

ALTER TABLE patient_reminders ENABLE ROW LEVEL SECURITY;
CREATE POLICY service_role_full_access_patient_reminders ON patient_reminders
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

-- ============================================================
-- 5. リマインダー配信履歴テーブル（重複防止）
-- ============================================================
CREATE TABLE IF NOT EXISTS patient_reminder_deliveries (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_reminder_id UUID NOT NULL REFERENCES patient_reminders(id) ON DELETE CASCADE,
  step_id             UUID NOT NULL REFERENCES reminder_steps(id) ON DELETE CASCADE,
  delivered_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(patient_reminder_id, step_id)
);

ALTER TABLE patient_reminder_deliveries ENABLE ROW LEVEL SECURITY;
CREATE POLICY service_role_full_access_patient_reminder_deliveries ON patient_reminder_deliveries
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

-- ============================================================
-- 6. step_scenarios テーブルに next_step_on_false カラム追加
-- （条件不成立時のジャンプ先ステップ）
-- ============================================================
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'step_scenarios' AND column_name = 'next_step_on_false'
  ) THEN
    ALTER TABLE step_scenarios ADD COLUMN next_step_on_false INTEGER;
  END IF;
END $$;

-- ステップシナリオのstepsテーブルにもジャンプ先追加（テーブル名はstep_scenario_stepsの場合）
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'step_scenario_steps') THEN
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_name = 'step_scenario_steps' AND column_name = 'next_step_on_false'
    ) THEN
      ALTER TABLE step_scenario_steps ADD COLUMN next_step_on_false INTEGER;
    END IF;
  END IF;
END $$;
