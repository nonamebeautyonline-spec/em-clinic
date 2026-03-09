-- AI返信 学習例テーブル（embeddingベクトル検索用）

-- pgvector拡張を有効化
CREATE EXTENSION IF NOT EXISTS vector;

-- 学習例テーブル
CREATE TABLE IF NOT EXISTS ai_reply_examples (
  id BIGSERIAL PRIMARY KEY,
  tenant_id UUID DEFAULT '00000000-0000-0000-0000-000000000001',
  question TEXT NOT NULL,
  answer TEXT NOT NULL,
  source TEXT NOT NULL CHECK (source IN ('staff_edit', 'manual_reply')),
  draft_id INTEGER REFERENCES ai_reply_drafts(id) ON DELETE SET NULL,
  embedding vector(1536),
  used_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS有効化
ALTER TABLE ai_reply_examples ENABLE ROW LEVEL SECURITY;

-- service_role用ポリシー
CREATE POLICY service_role_full_access ON ai_reply_examples
  FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

-- テナント + embedding でのベクトル検索用インデックス
CREATE INDEX idx_ai_reply_examples_tenant ON ai_reply_examples(tenant_id);
CREATE INDEX idx_ai_reply_examples_embedding ON ai_reply_examples
  USING hnsw (embedding vector_cosine_ops);

-- ベクトル類似検索関数
CREATE OR REPLACE FUNCTION match_ai_reply_examples(
  query_embedding vector(1536),
  match_threshold FLOAT,
  match_count INT,
  p_tenant_id UUID DEFAULT NULL
)
RETURNS TABLE (
  id BIGINT,
  question TEXT,
  answer TEXT,
  source TEXT,
  similarity FLOAT
)
LANGUAGE plpgsql
SET search_path = 'public'
AS $$
BEGIN
  RETURN QUERY
  SELECT
    e.id,
    e.question,
    e.answer,
    e.source,
    1 - (e.embedding <=> query_embedding) AS similarity
  FROM ai_reply_examples e
  WHERE
    e.embedding IS NOT NULL
    AND (p_tenant_id IS NULL OR e.tenant_id = p_tenant_id)
    AND 1 - (e.embedding <=> query_embedding) > match_threshold
  ORDER BY e.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;
