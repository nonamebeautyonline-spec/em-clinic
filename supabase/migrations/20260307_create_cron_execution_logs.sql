-- cron_execution_logs: Cron実行履歴テーブル
CREATE TABLE IF NOT EXISTS cron_execution_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  cron_name TEXT NOT NULL,
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  finished_at TIMESTAMPTZ,
  status TEXT NOT NULL DEFAULT 'running' CHECK (status IN ('running', 'success', 'failed')),
  result_summary JSONB,
  error_message TEXT,
  duration_ms INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- インデックス
CREATE INDEX idx_cron_execution_logs_tenant_id ON cron_execution_logs(tenant_id);
CREATE INDEX idx_cron_execution_logs_cron_name ON cron_execution_logs(cron_name);
CREATE INDEX idx_cron_execution_logs_started_at ON cron_execution_logs(started_at DESC);
CREATE INDEX idx_cron_execution_logs_status ON cron_execution_logs(status);

-- RLS有効化
ALTER TABLE cron_execution_logs ENABLE ROW LEVEL SECURITY;

-- service_role用フルアクセスポリシー
CREATE POLICY service_role_full_access ON cron_execution_logs
  FOR ALL
  TO service_role
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');
