-- ステップ配信 実行ログテーブル
CREATE TABLE IF NOT EXISTS step_execution_logs (
  id SERIAL PRIMARY KEY,
  enrollment_id INTEGER NOT NULL REFERENCES step_enrollments(id) ON DELETE CASCADE,
  scenario_id INTEGER NOT NULL,
  step_order INTEGER NOT NULL,
  step_type VARCHAR(30) NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'success',  -- success, failed, skipped, condition_false
  detail JSONB DEFAULT '{}',
  executed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  tenant_id UUID NOT NULL DEFAULT '00000000-0000-0000-0000-000000000001'
);

ALTER TABLE step_execution_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY service_role_full_access ON step_execution_logs
  FOR ALL USING (auth.role() = 'service_role');

CREATE INDEX IF NOT EXISTS idx_step_execution_logs_enrollment ON step_execution_logs(enrollment_id);
CREATE INDEX IF NOT EXISTS idx_step_execution_logs_scenario ON step_execution_logs(scenario_id, tenant_id);
