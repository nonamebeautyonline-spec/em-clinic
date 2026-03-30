-- =============================================================
-- Month 3: Escalation Intelligence + Staff Handoff + Failure Review
-- 2026-04-15
-- =============================================================

ALTER TABLE ai_reply_drafts
  ADD COLUMN IF NOT EXISTS escalation_detail JSONB,
  ADD COLUMN IF NOT EXISTS handoff_summary JSONB,
  ADD COLUMN IF NOT EXISTS review_note TEXT;

CREATE INDEX IF NOT EXISTS idx_ai_reply_drafts_rejected
  ON ai_reply_drafts(status, rejected_at DESC)
  WHERE status = 'rejected';

COMMENT ON COLUMN ai_reply_drafts.escalation_detail
  IS 'エスカレーション時の構造化詳細 {urgency, summary, missing_info, suggested_next_action, escalation_team}';
COMMENT ON COLUMN ai_reply_drafts.handoff_summary
  IS 'スタッフ引継ぎサマリー {conversation_summary, patient_context, ai_reasoning, suggested_actions}';
COMMENT ON COLUMN ai_reply_drafts.review_note
  IS 'Failure Reviewでのスタッフ改善メモ';
