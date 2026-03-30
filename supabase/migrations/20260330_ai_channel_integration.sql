-- チャネル統合: Unified Intake + Conversation Merge
-- ai_cases: 患者単位のケース管理
-- ai_case_links: ケースとタスクのリンク
-- ai_tasks: チャネル情報追加

CREATE TABLE IF NOT EXISTS ai_cases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES tenants(id),
  patient_id VARCHAR(50),
  status VARCHAR(20) DEFAULT 'open',
  summary TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  resolved_at TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS idx_ai_cases_patient ON ai_cases(tenant_id, patient_id, status);
ALTER TABLE ai_cases ENABLE ROW LEVEL SECURITY;
CREATE POLICY service_role_full_access ON ai_cases FOR ALL USING (auth.role() = 'service_role') WITH CHECK (auth.role() = 'service_role');

CREATE TABLE IF NOT EXISTS ai_case_links (
  id BIGSERIAL PRIMARY KEY,
  case_id UUID REFERENCES ai_cases(id) ON DELETE CASCADE,
  task_id UUID REFERENCES ai_tasks(id) ON DELETE CASCADE,
  channel_type VARCHAR(30) NOT NULL,
  linked_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(case_id, task_id)
);
ALTER TABLE ai_case_links ENABLE ROW LEVEL SECURITY;
CREATE POLICY service_role_full_access ON ai_case_links FOR ALL USING (auth.role() = 'service_role') WITH CHECK (auth.role() = 'service_role');

ALTER TABLE ai_tasks
  ADD COLUMN IF NOT EXISTS channel_type VARCHAR(30) DEFAULT 'line',
  ADD COLUMN IF NOT EXISTS case_id UUID REFERENCES ai_cases(id);
CREATE INDEX IF NOT EXISTS idx_ai_tasks_channel ON ai_tasks(channel_type);
CREATE INDEX IF NOT EXISTS idx_ai_tasks_case ON ai_tasks(case_id);
