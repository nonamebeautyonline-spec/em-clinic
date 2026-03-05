-- カルテ同時編集セッション管理テーブル
-- 同一カルテを複数人が同時に編集しようとした場合の検知・警告用
CREATE TABLE IF NOT EXISTS karte_edit_sessions (
  id BIGSERIAL PRIMARY KEY,
  intake_id BIGINT NOT NULL,
  editor_name TEXT NOT NULL,
  last_heartbeat TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  tenant_id UUID
);

ALTER TABLE karte_edit_sessions ENABLE ROW LEVEL SECURITY;
CREATE POLICY service_role_full_access ON karte_edit_sessions
  FOR ALL USING (auth.role() = 'service_role');

CREATE INDEX IF NOT EXISTS idx_karte_edit_sessions_intake
  ON karte_edit_sessions(intake_id);
CREATE INDEX IF NOT EXISTS idx_karte_edit_sessions_heartbeat
  ON karte_edit_sessions(last_heartbeat);

SET search_path = 'public';
