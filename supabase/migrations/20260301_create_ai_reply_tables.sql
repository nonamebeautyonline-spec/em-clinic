-- AI返信案の一時保存テーブル
CREATE TABLE IF NOT EXISTS ai_reply_drafts (
  id SERIAL PRIMARY KEY,
  tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
  patient_id VARCHAR(20) NOT NULL,
  line_uid VARCHAR(100) NOT NULL,
  original_message TEXT NOT NULL,
  ai_category VARCHAR(30) NOT NULL,
  draft_reply TEXT,
  confidence REAL,
  status VARCHAR(20) NOT NULL DEFAULT 'pending',
  approved_at TIMESTAMPTZ,
  rejected_at TIMESTAMPTZ,
  sent_at TIMESTAMPTZ,
  model_used VARCHAR(50),
  input_tokens INTEGER,
  output_tokens INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ
);

CREATE INDEX idx_ai_reply_drafts_status ON ai_reply_drafts(status, created_at DESC);
CREATE INDEX idx_ai_reply_drafts_patient ON ai_reply_drafts(patient_id, created_at DESC);
CREATE INDEX idx_ai_reply_drafts_tenant ON ai_reply_drafts(tenant_id);

ALTER TABLE ai_reply_drafts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "service_role_only_ai_drafts" ON ai_reply_drafts
  FOR ALL USING (auth.role() = 'service_role');

-- テナントごとのAI返信設定テーブル
CREATE TABLE IF NOT EXISTS ai_reply_settings (
  id SERIAL PRIMARY KEY,
  tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
  is_enabled BOOLEAN NOT NULL DEFAULT false,
  mode VARCHAR(20) NOT NULL DEFAULT 'approval',
  knowledge_base TEXT,
  custom_instructions TEXT,
  min_message_length INTEGER DEFAULT 5,
  daily_limit INTEGER DEFAULT 100,
  approval_timeout_hours INTEGER DEFAULT 24,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(tenant_id)
);

ALTER TABLE ai_reply_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "service_role_only_ai_settings" ON ai_reply_settings
  FOR ALL USING (auth.role() = 'service_role');
