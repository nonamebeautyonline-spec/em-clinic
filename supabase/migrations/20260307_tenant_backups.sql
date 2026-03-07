-- テナントバックアップ管理テーブル
CREATE TABLE IF NOT EXISTS tenant_backups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  name TEXT NOT NULL,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
  file_url TEXT,
  file_size BIGINT,
  tables_included TEXT[],
  record_counts JSONB,
  error_message TEXT,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ
);

-- RLS有効化
ALTER TABLE tenant_backups ENABLE ROW LEVEL SECURITY;

-- service_role用フルアクセスポリシー
CREATE POLICY service_role_full_access ON tenant_backups
  FOR ALL
  TO service_role
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

-- インデックス
CREATE INDEX idx_tenant_backups_tenant_id ON tenant_backups(tenant_id);
CREATE INDEX idx_tenant_backups_status ON tenant_backups(status);
