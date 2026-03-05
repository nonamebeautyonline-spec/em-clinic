-- 音声認識補正フィードバックテーブル
-- ユーザーが補正結果を承認/修正した記録を保存し、辞書の改善に活用する

CREATE TABLE IF NOT EXISTS correction_feedback (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES tenants(id),
  original_text TEXT NOT NULL,
  corrected_text TEXT NOT NULL,
  user_edited_text TEXT,
  corrections JSONB,
  was_accepted BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE correction_feedback ENABLE ROW LEVEL SECURITY;

CREATE POLICY service_role_full_access ON correction_feedback
  FOR ALL USING (auth.role() = 'service_role');

-- テナント + 日付でのクエリ用インデックス
CREATE INDEX IF NOT EXISTS idx_correction_feedback_tenant_created
  ON correction_feedback (tenant_id, created_at DESC);
