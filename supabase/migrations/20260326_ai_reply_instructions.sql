-- 修正指示の永続化 + RAGパラメータのテナント設定化
-- ai_reply_drafts に修正指示履歴カラム追加
ALTER TABLE ai_reply_drafts
  ADD COLUMN IF NOT EXISTS past_instructions JSONB DEFAULT '[]'::jsonb;

COMMENT ON COLUMN ai_reply_drafts.past_instructions IS '再生成時の修正指示履歴（文字列配列）';

-- ai_reply_settings にRAGパラメータカラム追加
ALTER TABLE ai_reply_settings
  ADD COLUMN IF NOT EXISTS rag_similarity_threshold FLOAT DEFAULT 0.35,
  ADD COLUMN IF NOT EXISTS rag_max_examples INTEGER DEFAULT 5,
  ADD COLUMN IF NOT EXISTS rag_max_kb_chunks INTEGER DEFAULT 5;

COMMENT ON COLUMN ai_reply_settings.rag_similarity_threshold IS 'RAG検索の類似度閾値（0.0-1.0）';
COMMENT ON COLUMN ai_reply_settings.rag_max_examples IS 'RAG検索で返す学習例の最大数';
COMMENT ON COLUMN ai_reply_settings.rag_max_kb_chunks IS 'RAG検索で返すKBチャンクの最大数';
