-- ワークフロー自動化テーブル

-- ワークフロー管理テーブル
CREATE TABLE workflows (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  name TEXT NOT NULL,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'draft', -- draft/active/paused/archived
  trigger_type TEXT NOT NULL, -- reservation_completed/payment_completed/tag_added/form_submitted/scheduled/manual
  trigger_config JSONB NOT NULL DEFAULT '{}', -- トリガー条件の詳細設定
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ワークフローステップ
CREATE TABLE workflow_steps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workflow_id UUID NOT NULL REFERENCES workflows(id) ON DELETE CASCADE,
  sort_order INTEGER NOT NULL DEFAULT 0,
  step_type TEXT NOT NULL, -- send_message/add_tag/remove_tag/switch_richmenu/wait/condition/webhook
  config JSONB NOT NULL DEFAULT '{}', -- ステップ設定
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ワークフロー実行ログ
CREATE TABLE workflow_executions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workflow_id UUID NOT NULL REFERENCES workflows(id),
  patient_id UUID,
  status TEXT NOT NULL DEFAULT 'running', -- running/completed/failed/skipped
  trigger_data JSONB, -- トリガー時のコンテキストデータ
  current_step INTEGER NOT NULL DEFAULT 0,
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ,
  error TEXT
);

-- インデックス
CREATE INDEX idx_workflows_tenant_id ON workflows(tenant_id);
CREATE INDEX idx_workflows_status ON workflows(status);
CREATE INDEX idx_workflow_steps_workflow_id ON workflow_steps(workflow_id);
CREATE INDEX idx_workflow_executions_workflow_id ON workflow_executions(workflow_id);
CREATE INDEX idx_workflow_executions_patient_id ON workflow_executions(patient_id);
CREATE INDEX idx_workflow_executions_status ON workflow_executions(status);

-- RLSポリシー
ALTER TABLE workflows ENABLE ROW LEVEL SECURITY;
ALTER TABLE workflow_steps ENABLE ROW LEVEL SECURITY;
ALTER TABLE workflow_executions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "service_role_only" ON workflows FOR ALL TO service_role USING (true);
CREATE POLICY "service_role_only" ON workflow_steps FOR ALL TO service_role USING (true);
CREATE POLICY "service_role_only" ON workflow_executions FOR ALL TO service_role USING (true);
