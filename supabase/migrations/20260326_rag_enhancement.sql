-- RAG機能強化マイグレーション
-- 1. pg_trgm拡張（Hybrid Search用）
-- 2. knowledge_chunks テーブル（KB チャンキング用）
-- 3. ai_reply_examples に answer_embedding + quality_score カラム追加
-- 4. Hybrid Search RPC（ベクトル + trigram + RRF統合）
-- 5. Knowledge Chunk 検索 RPC

-- =============================================================
-- 1. pg_trgm 拡張を有効化（Hybrid Search のキーワード検索用）
-- =============================================================
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- =============================================================
-- 2. knowledge_chunks テーブル（KB チャンキング用）
-- =============================================================
CREATE TABLE IF NOT EXISTS knowledge_chunks (
  id BIGSERIAL PRIMARY KEY,
  tenant_id UUID DEFAULT '00000000-0000-0000-0000-000000000001',
  title TEXT NOT NULL DEFAULT '',
  content TEXT NOT NULL,
  source TEXT NOT NULL DEFAULT 'knowledge_base', -- 'knowledge_base', 'faq', 'manual'
  embedding vector(1536),
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE knowledge_chunks ENABLE ROW LEVEL SECURITY;

CREATE POLICY service_role_full_access ON knowledge_chunks
  FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

CREATE INDEX idx_knowledge_chunks_tenant ON knowledge_chunks(tenant_id);
CREATE INDEX idx_knowledge_chunks_embedding ON knowledge_chunks
  USING hnsw (embedding vector_cosine_ops);
CREATE INDEX idx_knowledge_chunks_content_trgm ON knowledge_chunks
  USING gin (content gin_trgm_ops);

-- =============================================================
-- 3. ai_reply_examples に answer_embedding + quality_score 追加
-- =============================================================
ALTER TABLE ai_reply_examples
  ADD COLUMN IF NOT EXISTS answer_embedding vector(1536),
  ADD COLUMN IF NOT EXISTS quality_score FLOAT DEFAULT 1.0,
  ADD COLUMN IF NOT EXISTS approved_count INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS rejected_count INTEGER DEFAULT 0;

-- trigram 検索用インデックス（Hybrid Search）
CREATE INDEX IF NOT EXISTS idx_ai_reply_examples_question_trgm
  ON ai_reply_examples USING gin (question gin_trgm_ops);

-- answer_embedding 用 HNSW インデックス
CREATE INDEX IF NOT EXISTS idx_ai_reply_examples_answer_embedding
  ON ai_reply_examples USING hnsw (answer_embedding vector_cosine_ops);

-- =============================================================
-- 4. Hybrid Search RPC（ベクトル + trigram + RRF 統合 + 品質重み付け）
-- =============================================================
CREATE OR REPLACE FUNCTION match_ai_reply_examples_hybrid(
  query_embedding vector(1536),
  query_text TEXT,
  match_threshold FLOAT,
  match_count INT,
  p_tenant_id UUID DEFAULT NULL
)
RETURNS TABLE (
  id BIGINT,
  question TEXT,
  answer TEXT,
  source TEXT,
  similarity FLOAT,
  keyword_similarity FLOAT,
  rrf_score FLOAT,
  quality_score FLOAT
)
LANGUAGE plpgsql
SET search_path = 'public'
AS $$
BEGIN
  RETURN QUERY
  WITH
  -- ベクトル検索（top N*3 を取得して後でマージ）
  vector_results AS (
    SELECT
      e.id,
      e.question,
      e.answer,
      e.source,
      (1 - (e.embedding <=> query_embedding)) AS vec_similarity,
      e.quality_score AS q_score,
      e.created_at,
      ROW_NUMBER() OVER (ORDER BY e.embedding <=> query_embedding) AS vec_rank
    FROM ai_reply_examples e
    WHERE
      e.embedding IS NOT NULL
      AND (p_tenant_id IS NULL OR e.tenant_id = p_tenant_id)
      AND (1 - (e.embedding <=> query_embedding)) > match_threshold * 0.7
    ORDER BY e.embedding <=> query_embedding
    LIMIT match_count * 3
  ),
  -- trigram キーワード検索
  keyword_results AS (
    SELECT
      e.id,
      e.question,
      e.answer,
      e.source,
      similarity(e.question, query_text) AS kw_similarity,
      e.quality_score AS q_score,
      e.created_at,
      ROW_NUMBER() OVER (ORDER BY similarity(e.question, query_text) DESC) AS kw_rank
    FROM ai_reply_examples e
    WHERE
      (p_tenant_id IS NULL OR e.tenant_id = p_tenant_id)
      AND e.question % query_text  -- trigram 類似度フィルタ
    ORDER BY similarity(e.question, query_text) DESC
    LIMIT match_count * 3
  ),
  -- RRF（Reciprocal Rank Fusion）で統合
  merged AS (
    SELECT
      COALESCE(v.id, k.id) AS id,
      COALESCE(v.question, k.question) AS question,
      COALESCE(v.answer, k.answer) AS answer,
      COALESCE(v.source, k.source) AS source,
      COALESCE(v.vec_similarity, 0) AS vec_similarity,
      COALESCE(k.kw_similarity, 0) AS kw_similarity,
      -- RRF スコア: ベクトル重み0.7 + キーワード重み0.3
      (0.7 / (60 + COALESCE(v.vec_rank, 999))) + (0.3 / (60 + COALESCE(k.kw_rank, 999))) AS raw_rrf,
      COALESCE(v.q_score, k.q_score, 1.0) AS q_score,
      COALESCE(v.created_at, k.created_at) AS created_at
    FROM vector_results v
    FULL OUTER JOIN keyword_results k ON v.id = k.id
  )
  SELECT
    m.id,
    m.question,
    m.answer,
    m.source,
    m.vec_similarity AS similarity,
    m.kw_similarity AS keyword_similarity,
    -- 品質スコア × 時間減衰（30日で10%減衰、最小0.5）を RRF に乗算
    m.raw_rrf
      * m.q_score
      * GREATEST(0.5, 1.0 - 0.1 * EXTRACT(EPOCH FROM (NOW() - m.created_at)) / (86400 * 30))
    AS rrf_score,
    m.q_score AS quality_score
  FROM merged m
  WHERE m.vec_similarity > match_threshold OR m.kw_similarity > 0.3
  ORDER BY rrf_score DESC
  LIMIT match_count;
END;
$$;

-- =============================================================
-- 5. Knowledge Chunk 検索 RPC
-- =============================================================
CREATE OR REPLACE FUNCTION match_knowledge_chunks(
  query_embedding vector(1536),
  query_text TEXT,
  match_threshold FLOAT,
  match_count INT,
  p_tenant_id UUID DEFAULT NULL
)
RETURNS TABLE (
  id BIGINT,
  title TEXT,
  content TEXT,
  source TEXT,
  similarity FLOAT,
  keyword_similarity FLOAT,
  combined_score FLOAT
)
LANGUAGE plpgsql
SET search_path = 'public'
AS $$
BEGIN
  RETURN QUERY
  WITH
  vector_results AS (
    SELECT
      c.id, c.title, c.content, c.source,
      (1 - (c.embedding <=> query_embedding)) AS vec_sim,
      ROW_NUMBER() OVER (ORDER BY c.embedding <=> query_embedding) AS vec_rank
    FROM knowledge_chunks c
    WHERE
      c.embedding IS NOT NULL
      AND (p_tenant_id IS NULL OR c.tenant_id = p_tenant_id)
      AND (1 - (c.embedding <=> query_embedding)) > match_threshold * 0.7
    ORDER BY c.embedding <=> query_embedding
    LIMIT match_count * 3
  ),
  keyword_results AS (
    SELECT
      c.id, c.title, c.content, c.source,
      similarity(c.content, query_text) AS kw_sim,
      ROW_NUMBER() OVER (ORDER BY similarity(c.content, query_text) DESC) AS kw_rank
    FROM knowledge_chunks c
    WHERE
      (p_tenant_id IS NULL OR c.tenant_id = p_tenant_id)
      AND c.content % query_text
    ORDER BY similarity(c.content, query_text) DESC
    LIMIT match_count * 3
  ),
  merged AS (
    SELECT
      COALESCE(v.id, k.id) AS id,
      COALESCE(v.title, k.title) AS title,
      COALESCE(v.content, k.content) AS content,
      COALESCE(v.source, k.source) AS source,
      COALESCE(v.vec_sim, 0) AS vec_sim,
      COALESCE(k.kw_sim, 0) AS kw_sim,
      (0.7 / (60 + COALESCE(v.vec_rank, 999))) + (0.3 / (60 + COALESCE(k.kw_rank, 999))) AS combined
    FROM vector_results v
    FULL OUTER JOIN keyword_results k ON v.id = k.id
  )
  SELECT
    m.id, m.title, m.content, m.source,
    m.vec_sim AS similarity,
    m.kw_sim AS keyword_similarity,
    m.combined AS combined_score
  FROM merged m
  WHERE m.vec_sim > match_threshold OR m.kw_sim > 0.3
  ORDER BY combined_score DESC
  LIMIT match_count;
END;
$$;

-- =============================================================
-- 6. 重複検出用RPC（保存前にcosine類似度0.95以上を検出）
-- =============================================================
CREATE OR REPLACE FUNCTION find_near_duplicate_examples(
  query_embedding vector(1536),
  p_tenant_id UUID DEFAULT NULL,
  p_threshold FLOAT DEFAULT 0.95
)
RETURNS TABLE (
  id BIGINT,
  question TEXT,
  answer TEXT,
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
    (1 - (e.embedding <=> query_embedding)) AS similarity
  FROM ai_reply_examples e
  WHERE
    e.embedding IS NOT NULL
    AND (p_tenant_id IS NULL OR e.tenant_id = p_tenant_id)
    AND (1 - (e.embedding <=> query_embedding)) > p_threshold
  ORDER BY e.embedding <=> query_embedding
  LIMIT 1;
END;
$$;
