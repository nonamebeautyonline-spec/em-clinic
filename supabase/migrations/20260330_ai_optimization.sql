-- AI最適化: ソース重み + 自動チューニング提案
-- 2026-03-30

-- ソース重み管理テーブル
CREATE TABLE IF NOT EXISTS ai_source_weights (
  id BIGSERIAL PRIMARY KEY,
  tenant_id UUID REFERENCES tenants(id),
  workflow_type TEXT NOT NULL,
  source_type VARCHAR(30) NOT NULL,
  weight NUMERIC(5,4) DEFAULT 1.0,
  is_active BOOLEAN DEFAULT true,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(tenant_id, workflow_type, source_type)
);
ALTER TABLE ai_source_weights ENABLE ROW LEVEL SECURITY;
CREATE POLICY service_role_full_access ON ai_source_weights FOR ALL USING (auth.role() = 'service_role') WITH CHECK (auth.role() = 'service_role');

-- 自動チューニング提案テーブル
CREATE TABLE IF NOT EXISTS ai_tuning_suggestions (
  id BIGSERIAL PRIMARY KEY,
  tenant_id UUID REFERENCES tenants(id),
  suggestion_type VARCHAR(30) NOT NULL,
  current_config JSONB NOT NULL,
  suggested_config JSONB NOT NULL,
  expected_improvement JSONB DEFAULT '{}',
  evidence JSONB DEFAULT '[]',
  status VARCHAR(20) DEFAULT 'pending',
  created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE ai_tuning_suggestions ENABLE ROW LEVEL SECURITY;
CREATE POLICY service_role_full_access ON ai_tuning_suggestions FOR ALL USING (auth.role() = 'service_role') WITH CHECK (auth.role() = 'service_role');
