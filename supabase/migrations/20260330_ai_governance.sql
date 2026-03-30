-- AI Governance: 設定バージョン管理・変更承認・監査・Offline Eval
-- Phase 3: 評価・ガバナンス基盤

-- 1. 設定バージョン管理
CREATE TABLE IF NOT EXISTS ai_config_versions (
  id BIGSERIAL PRIMARY KEY,
  tenant_id UUID REFERENCES tenants(id),
  config_type VARCHAR(50) NOT NULL,
  config_snapshot JSONB NOT NULL,
  version_number INT NOT NULL,
  created_by TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(tenant_id, config_type, version_number)
);
ALTER TABLE ai_config_versions ENABLE ROW LEVEL SECURITY;
CREATE POLICY service_role_full_access ON ai_config_versions FOR ALL USING (auth.role() = 'service_role') WITH CHECK (auth.role() = 'service_role');

-- 2. 設定変更リクエスト（承認フロー）
CREATE TABLE IF NOT EXISTS ai_config_change_requests (
  id BIGSERIAL PRIMARY KEY,
  tenant_id UUID REFERENCES tenants(id),
  config_type VARCHAR(50) NOT NULL,
  change_description TEXT NOT NULL,
  diff JSONB NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'pending',
  requested_by TEXT NOT NULL,
  reviewed_by TEXT,
  reviewed_at TIMESTAMPTZ,
  applied_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE ai_config_change_requests ENABLE ROW LEVEL SECURITY;
CREATE POLICY service_role_full_access ON ai_config_change_requests FOR ALL USING (auth.role() = 'service_role') WITH CHECK (auth.role() = 'service_role');

-- 3. 設定監査ログ
CREATE TABLE IF NOT EXISTS ai_config_audit_logs (
  id BIGSERIAL PRIMARY KEY,
  tenant_id UUID REFERENCES tenants(id),
  config_type VARCHAR(50) NOT NULL,
  action VARCHAR(30) NOT NULL,
  before_value JSONB,
  after_value JSONB,
  actor TEXT NOT NULL,
  actor_role VARCHAR(30),
  created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE ai_config_audit_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY service_role_full_access ON ai_config_audit_logs FOR ALL USING (auth.role() = 'service_role') WITH CHECK (auth.role() = 'service_role');

-- 4. Offline Eval: 実行管理
CREATE TABLE IF NOT EXISTS ai_eval_runs (
  id BIGSERIAL PRIMARY KEY,
  tenant_id UUID REFERENCES tenants(id),
  eval_name TEXT NOT NULL,
  config_a JSONB NOT NULL,
  config_b JSONB NOT NULL,
  status VARCHAR(20) DEFAULT 'running',
  total_cases INT DEFAULT 0,
  completed_cases INT DEFAULT 0,
  results_summary JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);
ALTER TABLE ai_eval_runs ENABLE ROW LEVEL SECURITY;
CREATE POLICY service_role_full_access ON ai_eval_runs FOR ALL USING (auth.role() = 'service_role') WITH CHECK (auth.role() = 'service_role');

-- 5. Offline Eval: 個別結果
CREATE TABLE IF NOT EXISTS ai_eval_results (
  id BIGSERIAL PRIMARY KEY,
  eval_run_id BIGINT REFERENCES ai_eval_runs(id) ON DELETE CASCADE,
  original_task_id UUID REFERENCES ai_tasks(id),
  config_key VARCHAR(10) NOT NULL,
  output JSONB,
  scores JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE ai_eval_results ENABLE ROW LEVEL SECURITY;
CREATE POLICY service_role_full_access ON ai_eval_results FOR ALL USING (auth.role() = 'service_role') WITH CHECK (auth.role() = 'service_role');
