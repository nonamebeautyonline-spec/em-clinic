-- AI Workflow 共通基盤テーブル（Month 1）
-- 既存AI返信テーブルとは並存。ブリッジ関数でai_reply_drafts → ai_tasksに同期

-- ============================================================
-- ai_tasks: workflow タスクの統一テーブル
-- ============================================================
CREATE TABLE IF NOT EXISTS ai_tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES tenants(id),
  workflow_type TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  -- 入力
  input JSONB NOT NULL DEFAULT '{}',
  subject_id TEXT,
  subject_type TEXT,
  -- 出力
  output JSONB,
  output_evidence JSONB DEFAULT '[]',
  -- ハンドオフ
  handoff_summary JSONB NOT NULL DEFAULT '{}',
  handoff_status TEXT DEFAULT 'pending',
  -- トレース（全中間結果）
  trace JSONB DEFAULT '{}',
  prompt_hash TEXT,
  model_name TEXT,
  input_tokens INT DEFAULT 0,
  output_tokens INT DEFAULT 0,
  -- タイムスタンプ
  created_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ai_tasks_tenant_workflow ON ai_tasks(tenant_id, workflow_type);
CREATE INDEX IF NOT EXISTS idx_ai_tasks_status ON ai_tasks(tenant_id, status);
CREATE INDEX IF NOT EXISTS idx_ai_tasks_subject ON ai_tasks(tenant_id, subject_type, subject_id);
CREATE INDEX IF NOT EXISTS idx_ai_tasks_created ON ai_tasks(tenant_id, created_at DESC);

ALTER TABLE ai_tasks ENABLE ROW LEVEL SECURITY;

CREATE POLICY service_role_full_access ON ai_tasks
  FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

-- ============================================================
-- ai_task_feedback: タスクへのフィードバック
-- ============================================================
CREATE TABLE IF NOT EXISTS ai_task_feedback (
  id SERIAL PRIMARY KEY,
  tenant_id UUID REFERENCES tenants(id),
  task_id UUID NOT NULL REFERENCES ai_tasks(id) ON DELETE CASCADE,
  feedback_type TEXT NOT NULL,
  rating INT CHECK (rating BETWEEN 1 AND 5),
  comment TEXT,
  reject_category TEXT,
  corrected_output JSONB,
  reviewed_by TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ai_task_feedback_task ON ai_task_feedback(task_id);
CREATE INDEX IF NOT EXISTS idx_ai_task_feedback_tenant ON ai_task_feedback(tenant_id);

ALTER TABLE ai_task_feedback ENABLE ROW LEVEL SECURITY;

CREATE POLICY service_role_full_access ON ai_task_feedback
  FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

-- ============================================================
-- ai_workflow_policy_rules: workflow 横断のポリシールール
-- ============================================================
CREATE TABLE IF NOT EXISTS ai_workflow_policy_rules (
  id SERIAL PRIMARY KEY,
  tenant_id UUID REFERENCES tenants(id),
  workflow_type TEXT NOT NULL,
  rule_name TEXT NOT NULL,
  rule_type TEXT NOT NULL,
  priority INT DEFAULT 100,
  conditions JSONB NOT NULL DEFAULT '{}',
  action JSONB NOT NULL DEFAULT '{}',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ai_workflow_policy_rules ON ai_workflow_policy_rules(tenant_id, workflow_type, is_active);

ALTER TABLE ai_workflow_policy_rules ENABLE ROW LEVEL SECURITY;

CREATE POLICY service_role_full_access ON ai_workflow_policy_rules
  FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');
