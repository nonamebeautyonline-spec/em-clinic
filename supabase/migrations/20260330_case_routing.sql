-- =============================================================
-- Case Routing: Haiku/Sonnet 動的振り分け
-- 2026-03-30
-- =============================================================

-- ai_reply_settings に case_routing_enabled カラム追加
ALTER TABLE ai_reply_settings
  ADD COLUMN IF NOT EXISTS case_routing_enabled BOOLEAN NOT NULL DEFAULT false;

-- ai_reply_drafts に routing_reason カラム追加
ALTER TABLE ai_reply_drafts
  ADD COLUMN IF NOT EXISTS routing_reason VARCHAR(50);

-- 統計クエリ用インデックス（model_used + routing_reason）
CREATE INDEX IF NOT EXISTS idx_ai_reply_drafts_model_routing
  ON ai_reply_drafts(model_used, routing_reason)
  WHERE routing_reason IS NOT NULL;

COMMENT ON COLUMN ai_reply_settings.case_routing_enabled
  IS 'Case Routing有効時、分類結果に基づいてHaiku/Sonnetを動的選択';
COMMENT ON COLUMN ai_reply_drafts.routing_reason
  IS 'Case Routingの振り分け理由コード（e.g. greeting_any, medical_always_sonnet）';
