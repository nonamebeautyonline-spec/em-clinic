-- Phase6: Safe Actions + 音声取り込み テーブル

CREATE TABLE IF NOT EXISTS ai_safe_action_proposals (
  id BIGSERIAL PRIMARY KEY,
  tenant_id UUID REFERENCES tenants(id),
  task_id UUID REFERENCES ai_tasks(id),
  action_type VARCHAR(50) NOT NULL,
  action_params JSONB NOT NULL,
  status VARCHAR(20) DEFAULT 'proposed',
  proposed_at TIMESTAMPTZ DEFAULT NOW(),
  approved_by TEXT,
  approved_at TIMESTAMPTZ,
  executed_at TIMESTAMPTZ,
  execution_result JSONB
);
CREATE INDEX IF NOT EXISTS idx_ai_safe_actions_task ON ai_safe_action_proposals(task_id);
CREATE INDEX IF NOT EXISTS idx_ai_safe_actions_status ON ai_safe_action_proposals(status);
ALTER TABLE ai_safe_action_proposals ENABLE ROW LEVEL SECURITY;
CREATE POLICY service_role_full_access ON ai_safe_action_proposals FOR ALL USING (auth.role() = 'service_role') WITH CHECK (auth.role() = 'service_role');

CREATE TABLE IF NOT EXISTS ai_voice_summaries (
  id BIGSERIAL PRIMARY KEY,
  tenant_id UUID REFERENCES tenants(id),
  call_id VARCHAR(100),
  caller_phone VARCHAR(20),
  patient_id VARCHAR(50),
  call_summary TEXT NOT NULL,
  call_duration_sec INT,
  call_direction VARCHAR(10),
  task_id UUID REFERENCES ai_tasks(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_ai_voice_tenant ON ai_voice_summaries(tenant_id, created_at DESC);
ALTER TABLE ai_voice_summaries ENABLE ROW LEVEL SECURITY;
CREATE POLICY service_role_full_access ON ai_voice_summaries FOR ALL USING (auth.role() = 'service_role') WITH CHECK (auth.role() = 'service_role');
