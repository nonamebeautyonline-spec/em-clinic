-- カルテテンプレートバージョン管理テーブル
CREATE TABLE IF NOT EXISTS karte_template_versions (
  id BIGSERIAL PRIMARY KEY,
  template_id INT NOT NULL,
  version INT NOT NULL DEFAULT 1,
  name TEXT NOT NULL,
  category TEXT DEFAULT 'general',
  body TEXT NOT NULL,
  changed_by TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  tenant_id UUID
);

ALTER TABLE karte_template_versions ENABLE ROW LEVEL SECURITY;
CREATE POLICY service_role_full_access ON karte_template_versions
  FOR ALL USING (auth.role() = 'service_role');

CREATE INDEX IF NOT EXISTS idx_template_versions_template
  ON karte_template_versions(template_id);
CREATE INDEX IF NOT EXISTS idx_template_versions_latest
  ON karte_template_versions(template_id, version DESC);

-- karte_templates にバージョン番号カラム追加
ALTER TABLE karte_templates ADD COLUMN IF NOT EXISTS current_version INT DEFAULT 1;

SET search_path = 'public';
