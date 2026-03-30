-- =============================================================
-- Month 4-A: Safe Actions
-- 2026-05-01
-- =============================================================

CREATE TABLE IF NOT EXISTS ai_proposed_actions (
  id SERIAL PRIMARY KEY,
  tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
  draft_id INT NOT NULL REFERENCES ai_reply_drafts(id) ON DELETE CASCADE,
  action_type VARCHAR(50) NOT NULL,
  action_params JSONB NOT NULL DEFAULT '{}',
  status VARCHAR(20) NOT NULL DEFAULT 'pending',
  approved_by VARCHAR(100),
  approved_at TIMESTAMPTZ,
  execution_result JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ai_proposed_actions_draft
  ON ai_proposed_actions(draft_id);
CREATE INDEX IF NOT EXISTS idx_ai_proposed_actions_status
  ON ai_proposed_actions(status);

ALTER TABLE ai_proposed_actions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "service_role_only_ai_actions" ON ai_proposed_actions
  FOR ALL USING (auth.role() = 'service_role');

COMMENT ON TABLE ai_proposed_actions
  IS 'AIが提案したwrite系アクション（承認後に実行）';
