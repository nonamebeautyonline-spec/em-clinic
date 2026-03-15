-- ポイント自動付与ルール
CREATE TABLE point_auto_grant_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  name TEXT NOT NULL,
  trigger_type TEXT NOT NULL CHECK (trigger_type IN ('per_purchase', 'first_purchase', 'amount_threshold')),
  points_amount INTEGER NOT NULL,
  trigger_config JSONB NOT NULL DEFAULT '{}',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE point_auto_grant_rules ENABLE ROW LEVEL SECURITY;
CREATE POLICY service_role_full_access ON point_auto_grant_rules FOR ALL USING (auth.role() = 'service_role');

-- ポイント自動付与ログ（重複防止）
CREATE TABLE point_auto_grant_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  rule_id UUID NOT NULL REFERENCES point_auto_grant_rules(id),
  patient_id TEXT NOT NULL,
  order_id TEXT,
  points_awarded INTEGER NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(rule_id, patient_id, order_id)
);

ALTER TABLE point_auto_grant_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY service_role_full_access ON point_auto_grant_logs FOR ALL USING (auth.role() = 'service_role');
