-- 患者セグメント自動分類テーブル
-- RFM分析に基づくセグメント（VIP / アクティブ / 離脱リスク / 休眠 / 新規）を格納

CREATE TABLE IF NOT EXISTS patient_segments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id VARCHAR(20) NOT NULL,
  tenant_id UUID,
  segment VARCHAR(50) NOT NULL,
  rfm_score JSONB NOT NULL DEFAULT '{}',
  calculated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (patient_id, tenant_id)
);

-- セグメント別検索用インデックス
CREATE INDEX IF NOT EXISTS idx_patient_segments_segment ON patient_segments(segment);

-- テナント別検索用インデックス
CREATE INDEX IF NOT EXISTS idx_patient_segments_tenant ON patient_segments(tenant_id);

-- RLS設定
ALTER TABLE patient_segments ENABLE ROW LEVEL SECURITY;

-- 認証済みユーザーは読み取り可能
CREATE POLICY "authenticated_read" ON patient_segments FOR SELECT USING (true);

-- service_role は全操作可能
CREATE POLICY "service_role_all" ON patient_segments FOR ALL USING (true);
