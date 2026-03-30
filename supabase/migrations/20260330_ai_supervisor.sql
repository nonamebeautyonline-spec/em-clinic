-- Phase 1: AI Supervisor / QA 基盤
-- ai_task_feedback に原因分類カラム追加 + 異常検知アラートテーブル

-- ai_task_feedback に原因分類カラム追加
ALTER TABLE ai_task_feedback
  ADD COLUMN IF NOT EXISTS failure_category VARCHAR(50),
  ADD COLUMN IF NOT EXISTS improvement_note TEXT;

-- 異常検知アラート永続化
CREATE TABLE IF NOT EXISTS ai_supervisor_alerts (
  id BIGSERIAL PRIMARY KEY,
  tenant_id UUID REFERENCES tenants(id),
  alert_type VARCHAR(50) NOT NULL,    -- quality_drop, cost_spike, sla_breach, failure_spike, escalation_spike
  severity VARCHAR(20) NOT NULL,       -- warning, critical
  metric_name VARCHAR(50) NOT NULL,    -- completed_rate, failed_rate, escalated_rate, token_cost, etc.
  workflow_type TEXT,
  current_value NUMERIC,
  baseline_value NUMERIC,
  threshold NUMERIC,
  details JSONB DEFAULT '{}',
  acknowledged_at TIMESTAMPTZ,
  acknowledged_by TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ai_supervisor_alerts_tenant
  ON ai_supervisor_alerts(tenant_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ai_supervisor_alerts_unacked
  ON ai_supervisor_alerts(acknowledged_at) WHERE acknowledged_at IS NULL;

ALTER TABLE ai_supervisor_alerts ENABLE ROW LEVEL SECURITY;

CREATE POLICY service_role_full_access ON ai_supervisor_alerts
  FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');
