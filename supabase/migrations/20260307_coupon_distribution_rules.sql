-- クーポン自動配布ルール機能
-- coupon_distribution_rules: 自動配布ルール定義
-- coupon_distribution_logs: 配布ログ（重複防止用）

-- ルールテーブル
CREATE TABLE IF NOT EXISTS coupon_distribution_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL DEFAULT '00000000-0000-0000-0000-000000000001',
  coupon_id INTEGER NOT NULL,
  name TEXT NOT NULL,
  trigger_type TEXT NOT NULL CHECK (trigger_type IN ('birthday', 'first_purchase_days', 'nth_visit', 'tag_added')),
  trigger_config JSONB NOT NULL DEFAULT '{}',
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- RLS有効化
ALTER TABLE coupon_distribution_rules ENABLE ROW LEVEL SECURITY;

-- service_role のみアクセス許可
CREATE POLICY service_role_full_access ON coupon_distribution_rules
  FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

-- インデックス
CREATE INDEX idx_cdr_tenant_id ON coupon_distribution_rules (tenant_id);
CREATE INDEX idx_cdr_coupon_id ON coupon_distribution_rules (coupon_id);
CREATE INDEX idx_cdr_active ON coupon_distribution_rules (is_active) WHERE is_active = true;

-- 配布ログテーブル
CREATE TABLE IF NOT EXISTS coupon_distribution_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL DEFAULT '00000000-0000-0000-0000-000000000001',
  rule_id UUID NOT NULL REFERENCES coupon_distribution_rules(id) ON DELETE CASCADE,
  patient_id TEXT NOT NULL,
  coupon_id INTEGER NOT NULL,
  distributed_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- RLS有効化
ALTER TABLE coupon_distribution_logs ENABLE ROW LEVEL SECURITY;

-- service_role のみアクセス許可
CREATE POLICY service_role_full_access ON coupon_distribution_logs
  FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

-- インデックス
CREATE INDEX idx_cdl_tenant_id ON coupon_distribution_logs (tenant_id);
CREATE INDEX idx_cdl_rule_patient ON coupon_distribution_logs (rule_id, patient_id);
CREATE INDEX idx_cdl_coupon_patient ON coupon_distribution_logs (coupon_id, patient_id);
CREATE INDEX idx_cdl_distributed_at ON coupon_distribution_logs (distributed_at);
