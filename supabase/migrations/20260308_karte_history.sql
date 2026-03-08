-- カルテステータス・編集履歴機能
-- intake テーブルにカルテステータス追加
ALTER TABLE intake ADD COLUMN IF NOT EXISTS karte_status TEXT DEFAULT 'draft';

-- カルテ編集履歴テーブル
CREATE TABLE IF NOT EXISTS karte_history (
  id BIGSERIAL PRIMARY KEY,
  tenant_id UUID,
  intake_id BIGINT NOT NULL,
  note_before TEXT,
  note_after TEXT,
  karte_status_before TEXT,
  karte_status_after TEXT,
  change_reason TEXT,
  changed_by TEXT NOT NULL,
  changed_by_id TEXT,
  changed_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- RLS
ALTER TABLE karte_history ENABLE ROW LEVEL SECURITY;
CREATE POLICY service_role_full_access ON karte_history
  FOR ALL TO service_role USING (auth.role() = 'service_role');

-- インデックス
CREATE INDEX idx_karte_history_intake ON karte_history(intake_id);
CREATE INDEX idx_karte_history_tenant ON karte_history(tenant_id);
CREATE INDEX idx_karte_history_changed_at ON karte_history(changed_at);
