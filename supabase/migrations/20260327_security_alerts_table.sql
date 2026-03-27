-- security_alerts テーブル定義
-- セキュリティイベント（不正アクセス、レート制限超過、設定変更等）を記録
-- 実行日: 2026-03-27

CREATE TABLE IF NOT EXISTS security_alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES tenants(id) ON DELETE SET NULL,
  alert_type TEXT NOT NULL,           -- login_failure, rate_limit, suspicious_access, config_change 等
  severity TEXT NOT NULL DEFAULT 'low', -- low, medium, high, critical
  title TEXT NOT NULL,
  description TEXT,
  metadata JSONB,                     -- 追加コンテキスト（IP、ユーザーエージェント等）
  acknowledged_at TIMESTAMPTZ,        -- 確認済み日時
  acknowledged_by UUID REFERENCES admin_users(id), -- 確認した管理者
  created_at TIMESTAMPTZ DEFAULT now()
);

-- インデックス
CREATE INDEX IF NOT EXISTS idx_security_alerts_tenant ON security_alerts(tenant_id);
CREATE INDEX IF NOT EXISTS idx_security_alerts_severity ON security_alerts(severity);
CREATE INDEX IF NOT EXISTS idx_security_alerts_created ON security_alerts(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_security_alerts_unacked ON security_alerts(acknowledged_at) WHERE acknowledged_at IS NULL;

-- RLS（20260304_security_advisor_fixes.sql で追加済みだが、テーブル作成後に確実に適用）
ALTER TABLE security_alerts ENABLE ROW LEVEL SECURITY;

-- ポリシー（既に存在する場合はスキップ）
DO $$ BEGIN
  CREATE POLICY "service_role_full_access_security_alerts" ON security_alerts
    FOR ALL USING (auth.role() = 'service_role');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
