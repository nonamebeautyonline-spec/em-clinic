-- =============================================================
-- answer_embedding を活用した Hybrid Search 改善
-- 既存の question ベクトル検索 + trigram に加え、
-- answer_embedding での類似検索を追加し、3系統を RRF で統合する
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
  -- 1. question ベクトル検索（cosine 類似度）
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
  -- 2. trigram キーワード検索
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
  -- 3. answer_embedding ベクトル検索（過去に似た回答をした例を検索）
  -- answer_embedding が NULL のレコードはスキップ
  answer_vector_results AS (
    SELECT
      e.id,
      e.question,
      e.answer,
      e.source,
      (1 - (e.answer_embedding <=> query_embedding)) AS ans_similarity,
      e.quality_score AS q_score,
      e.created_at,
      ROW_NUMBER() OVER (ORDER BY e.answer_embedding <=> query_embedding) AS ans_rank
    FROM ai_reply_examples e
    WHERE
      e.answer_embedding IS NOT NULL
      AND (p_tenant_id IS NULL OR e.tenant_id = p_tenant_id)
      AND (1 - (e.answer_embedding <=> query_embedding)) > match_threshold * 0.7
    ORDER BY e.answer_embedding <=> query_embedding
    LIMIT match_count * 3
  ),
  -- 3系統を RRF（Reciprocal Rank Fusion）で統合
  -- 重み: question vector 0.5 / keyword trigram 0.2 / answer vector 0.3
  merged AS (
    SELECT
      COALESCE(v.id, k.id, a.id) AS id,
      COALESCE(v.question, k.question, a.question) AS question,
      COALESCE(v.answer, k.answer, a.answer) AS answer,
      COALESCE(v.source, k.source, a.source) AS source,
      COALESCE(v.vec_similarity, 0) AS vec_similarity,
      COALESCE(k.kw_similarity, 0) AS kw_similarity,
      -- RRF スコア: question vector 重み0.5 + keyword 重み0.2 + answer vector 重み0.3
      (0.5 / (60 + COALESCE(v.vec_rank, 999)))
        + (0.2 / (60 + COALESCE(k.kw_rank, 999)))
        + (0.3 / (60 + COALESCE(a.ans_rank, 999)))
      AS raw_rrf,
      COALESCE(v.q_score, k.q_score, a.q_score, 1.0) AS q_score,
      COALESCE(v.created_at, k.created_at, a.created_at) AS created_at
    FROM vector_results v
    FULL OUTER JOIN keyword_results k ON v.id = k.id
    FULL OUTER JOIN answer_vector_results a ON COALESCE(v.id, k.id) = a.id
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
  WHERE m.vec_similarity > match_threshold OR m.kw_similarity > 0.3 OR m.raw_rrf > 0.003
  ORDER BY rrf_score DESC
  LIMIT match_count;
END;
$$;
