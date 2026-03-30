-- =============================================================
-- Month 2-A: Semantic Reuse
-- 2026-04-01
-- =============================================================

-- ai_reply_drafts に再利用元情報を追加
ALTER TABLE ai_reply_drafts
  ADD COLUMN IF NOT EXISTS reuse_source_example_id INT,
  ADD COLUMN IF NOT EXISTS reuse_similarity REAL;

-- 再利用検索用インデックス
CREATE INDEX IF NOT EXISTS idx_ai_reply_examples_reuse_search
  ON ai_reply_examples(tenant_id, source, quality_score, created_at DESC)
  WHERE source = 'staff_edit' AND quality_score >= 1.0;

COMMENT ON COLUMN ai_reply_drafts.reuse_source_example_id
  IS 'Semantic Reuse時の元となったai_reply_examples.id';
COMMENT ON COLUMN ai_reply_drafts.reuse_similarity
  IS 'Semantic Reuse時の類似度スコア (0.0-1.0)';
