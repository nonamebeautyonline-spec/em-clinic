-- Phase 2: CV追跡・スコアリング・広告CAPI・アウトゴーイングWebhook
-- 実行: node scripts/run-sql.js supabase/migrations/20260401_phase2_cv_capi_webhooks.sql

-- ============================================================
-- 1. CVポイント定義テーブル
-- ============================================================
CREATE TABLE IF NOT EXISTS conversion_points (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name       VARCHAR(200) NOT NULL,
  event_type VARCHAR(100) NOT NULL,
  value      INTEGER,
  tenant_id  UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_conversion_points_tenant ON conversion_points (tenant_id);

ALTER TABLE conversion_points ENABLE ROW LEVEL SECURITY;
CREATE POLICY service_role_full_access_conversion_points ON conversion_points
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

-- ============================================================
-- 2. CVイベントテーブル
-- ============================================================
CREATE TABLE IF NOT EXISTS conversion_events (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversion_point_id UUID REFERENCES conversion_points(id) ON DELETE CASCADE,
  patient_id          VARCHAR(50) NOT NULL,
  affiliate_code      VARCHAR(100),
  metadata            JSONB,
  tenant_id           UUID NOT NULL,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_conversion_events_tenant ON conversion_events (tenant_id);
CREATE INDEX IF NOT EXISTS idx_conversion_events_point ON conversion_events (conversion_point_id);
CREATE INDEX IF NOT EXISTS idx_conversion_events_patient ON conversion_events (patient_id);
CREATE INDEX IF NOT EXISTS idx_conversion_events_affiliate ON conversion_events (affiliate_code);

ALTER TABLE conversion_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY service_role_full_access_conversion_events ON conversion_events
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

-- ============================================================
-- 3. スコアリングルールテーブル
-- ============================================================
CREATE TABLE IF NOT EXISTS scoring_rules (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name       VARCHAR(200) NOT NULL,
  event_type VARCHAR(100) NOT NULL,
  score_value INTEGER NOT NULL,
  is_active  BOOLEAN DEFAULT true,
  tenant_id  UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_scoring_rules_tenant ON scoring_rules (tenant_id);
CREATE INDEX IF NOT EXISTS idx_scoring_rules_event ON scoring_rules (event_type, is_active);

ALTER TABLE scoring_rules ENABLE ROW LEVEL SECURITY;
CREATE POLICY service_role_full_access_scoring_rules ON scoring_rules
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

-- ============================================================
-- 4. 患者スコア履歴テーブル
-- ============================================================
CREATE TABLE IF NOT EXISTS patient_scores (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id      VARCHAR(50) NOT NULL,
  scoring_rule_id UUID REFERENCES scoring_rules(id) ON DELETE SET NULL,
  score_change    INTEGER NOT NULL,
  reason          TEXT,
  tenant_id       UUID NOT NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_patient_scores_patient ON patient_scores (patient_id);
CREATE INDEX IF NOT EXISTS idx_patient_scores_tenant ON patient_scores (tenant_id);

ALTER TABLE patient_scores ENABLE ROW LEVEL SECURITY;
CREATE POLICY service_role_full_access_patient_scores ON patient_scores
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

-- ============================================================
-- 5. patients テーブルにスコアキャッシュ追加
-- ============================================================
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'patients' AND column_name = 'lead_score'
  ) THEN
    ALTER TABLE patients ADD COLUMN lead_score INTEGER DEFAULT 0;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_patients_lead_score ON patients (lead_score);

-- アトミック加算RPC
CREATE OR REPLACE FUNCTION increment_lead_score(
  p_patient_id TEXT,
  p_delta INTEGER,
  p_tenant_id UUID
)
RETURNS INTEGER
LANGUAGE SQL
SET search_path = 'public'
AS $$
  UPDATE patients
  SET lead_score = COALESCE(lead_score, 0) + p_delta,
      updated_at = NOW()
  WHERE patient_id = p_patient_id
    AND tenant_id = p_tenant_id
  RETURNING lead_score;
$$;

-- ============================================================
-- 6. 広告プラットフォーム設定テーブル
-- ============================================================
CREATE TABLE IF NOT EXISTS ad_platforms (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name         VARCHAR(50) NOT NULL CHECK (name IN ('meta', 'google', 'tiktok', 'x')),
  display_name VARCHAR(200),
  config       JSONB NOT NULL DEFAULT '{}',
  is_active    BOOLEAN DEFAULT true,
  tenant_id    UUID NOT NULL,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_ad_platforms_tenant ON ad_platforms (tenant_id);

ALTER TABLE ad_platforms ENABLE ROW LEVEL SECURITY;
CREATE POLICY service_role_full_access_ad_platforms ON ad_platforms
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

-- ============================================================
-- 7. 広告CV送信ログテーブル
-- ============================================================
CREATE TABLE IF NOT EXISTS ad_conversion_logs (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ad_platform_id  UUID NOT NULL,
  patient_id      VARCHAR(50) NOT NULL,
  event_name      VARCHAR(200) NOT NULL,
  click_id        VARCHAR(500),
  click_id_type   VARCHAR(20),
  status          VARCHAR(20) DEFAULT 'pending',
  error_message   TEXT,
  tenant_id       UUID NOT NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_ad_conversion_logs_platform ON ad_conversion_logs (ad_platform_id);
CREATE INDEX IF NOT EXISTS idx_ad_conversion_logs_tenant ON ad_conversion_logs (tenant_id);

ALTER TABLE ad_conversion_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY service_role_full_access_ad_conversion_logs ON ad_conversion_logs
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

-- ============================================================
-- 8. tracking_visits に gclid/fbclid/ttclid/twclid 追加
-- ============================================================
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'tracking_visits' AND column_name = 'gclid') THEN
    ALTER TABLE tracking_visits ADD COLUMN gclid VARCHAR(200);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'tracking_visits' AND column_name = 'fbclid') THEN
    ALTER TABLE tracking_visits ADD COLUMN fbclid VARCHAR(200);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'tracking_visits' AND column_name = 'twclid') THEN
    ALTER TABLE tracking_visits ADD COLUMN twclid VARCHAR(200);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'tracking_visits' AND column_name = 'ttclid') THEN
    ALTER TABLE tracking_visits ADD COLUMN ttclid VARCHAR(200);
  END IF;
END $$;

-- ============================================================
-- 9. アウトゴーイングWebhookテーブル
-- ============================================================
CREATE TABLE IF NOT EXISTS outgoing_webhooks (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name        VARCHAR(200) NOT NULL,
  url         TEXT NOT NULL,
  event_types JSONB NOT NULL DEFAULT '[]',
  secret      VARCHAR(500),
  is_active   BOOLEAN DEFAULT true,
  tenant_id   UUID NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_outgoing_webhooks_tenant ON outgoing_webhooks (tenant_id);

ALTER TABLE outgoing_webhooks ENABLE ROW LEVEL SECURITY;
CREATE POLICY service_role_full_access_outgoing_webhooks ON outgoing_webhooks
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');
