-- =============================================================
-- AI返信機能 12項目改善 マイグレーション
-- 2026-03-27
-- =============================================================

-- Phase 1-1: 根拠保存・可視化
ALTER TABLE ai_reply_drafts
  ADD COLUMN IF NOT EXISTS retrieved_example_ids INT[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS retrieved_chunks JSONB DEFAULT '[]',
  ADD COLUMN IF NOT EXISTS rewritten_query TEXT;

-- Phase 1-2: Evals基盤
ALTER TABLE ai_reply_drafts
  ADD COLUMN IF NOT EXISTS modified_reply TEXT,
  ADD COLUMN IF NOT EXISTS message_received_at TIMESTAMPTZ;

-- Phase 1-3: Source別Retrieval
ALTER TABLE ai_reply_examples
  ADD COLUMN IF NOT EXISTS category VARCHAR(20) DEFAULT 'staff_reply';
CREATE INDEX IF NOT EXISTS idx_ai_reply_examples_category ON ai_reply_examples(category);

-- Phase 1-3 追加: RPC に category カラム追加
DROP FUNCTION IF EXISTS match_ai_reply_examples_hybrid(vector(1536), TEXT, FLOAT, INT, UUID);
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
  category TEXT,
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
  vector_results AS (
    SELECT
      e.id,
      e.question,
      e.answer,
      e.source,
      e.category,
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
  keyword_results AS (
    SELECT
      e.id,
      e.question,
      e.answer,
      e.source,
      e.category,
      similarity(e.question, query_text) AS kw_similarity,
      e.quality_score AS q_score,
      e.created_at,
      ROW_NUMBER() OVER (ORDER BY similarity(e.question, query_text) DESC) AS kw_rank
    FROM ai_reply_examples e
    WHERE
      (p_tenant_id IS NULL OR e.tenant_id = p_tenant_id)
      AND e.question % query_text
    ORDER BY similarity(e.question, query_text) DESC
    LIMIT match_count * 3
  ),
  answer_vector_results AS (
    SELECT
      e.id,
      e.question,
      e.answer,
      e.source,
      e.category,
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
  merged AS (
    SELECT
      COALESCE(v.id, k.id, a.id) AS id,
      COALESCE(v.question, k.question, a.question) AS question,
      COALESCE(v.answer, k.answer, a.answer) AS answer,
      COALESCE(v.source, k.source, a.source) AS source,
      COALESCE(v.category, k.category, a.category) AS category,
      COALESCE(v.vec_similarity, 0) AS vec_similarity,
      COALESCE(k.kw_similarity, 0) AS kw_similarity,
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
    m.category,
    m.vec_similarity AS similarity,
    m.kw_similarity AS keyword_similarity,
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

-- Phase 1-4: Patient Memory
CREATE TABLE IF NOT EXISTS ai_patient_memory (
  id BIGSERIAL PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  patient_id VARCHAR(50) NOT NULL,
  memory_type VARCHAR(30) NOT NULL,
  content TEXT NOT NULL,
  source VARCHAR(30) DEFAULT 'auto',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  expires_at TIMESTAMPTZ,
  is_active BOOLEAN DEFAULT true
);
ALTER TABLE ai_patient_memory ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'ai_patient_memory' AND policyname = 'service_role_full_access'
  ) THEN
    CREATE POLICY service_role_full_access ON ai_patient_memory
      FOR ALL TO service_role USING (auth.role() = 'service_role');
  END IF;
END $$;
CREATE INDEX IF NOT EXISTS idx_ai_patient_memory_patient ON ai_patient_memory(tenant_id, patient_id, is_active);

-- Phase 2-1: Two-Stage分離
ALTER TABLE ai_reply_drafts
  ADD COLUMN IF NOT EXISTS classification_result JSONB,
  ADD COLUMN IF NOT EXISTS classification_model TEXT,
  ADD COLUMN IF NOT EXISTS classification_tokens INT DEFAULT 0;

-- Phase 2-2: Feedback学習強化
ALTER TABLE ai_reply_examples
  ADD COLUMN IF NOT EXISTS avg_approval_time_sec NUMERIC(10,2),
  ADD COLUMN IF NOT EXISTS modification_rate NUMERIC(5,4) DEFAULT 0;

-- Phase 2-3: Policy Engine
ALTER TABLE ai_reply_drafts
  ADD COLUMN IF NOT EXISTS policy_decision VARCHAR(30),
  ADD COLUMN IF NOT EXISTS policy_rule_hits JSONB DEFAULT '[]',
  ADD COLUMN IF NOT EXISTS escalation_reason TEXT;

CREATE TABLE IF NOT EXISTS ai_reply_policy_rules (
  id BIGSERIAL PRIMARY KEY,
  tenant_id UUID REFERENCES tenants(id),
  rule_name TEXT NOT NULL,
  rule_type VARCHAR(30) NOT NULL,
  priority INT NOT NULL DEFAULT 100,
  conditions JSONB NOT NULL DEFAULT '{}',
  action JSONB NOT NULL DEFAULT '{}',
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE ai_reply_policy_rules ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'ai_reply_policy_rules' AND policyname = 'service_role_full_access'
  ) THEN
    CREATE POLICY service_role_full_access ON ai_reply_policy_rules
      FOR ALL TO service_role USING (auth.role() = 'service_role');
  END IF;
END $$;
CREATE INDEX IF NOT EXISTS idx_policy_rules_tenant ON ai_reply_policy_rules(tenant_id, is_active, priority);

CREATE TABLE IF NOT EXISTS ai_reply_policy_logs (
  id BIGSERIAL PRIMARY KEY,
  tenant_id UUID REFERENCES tenants(id),
  draft_id BIGINT REFERENCES ai_reply_drafts(id) ON DELETE CASCADE,
  patient_id VARCHAR(50),
  matched_rules JSONB NOT NULL DEFAULT '[]',
  final_decision VARCHAR(30) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE ai_reply_policy_logs ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'ai_reply_policy_logs' AND policyname = 'service_role_full_access'
  ) THEN
    CREATE POLICY service_role_full_access ON ai_reply_policy_logs
      FOR ALL TO service_role USING (auth.role() = 'service_role');
  END IF;
END $$;

-- Phase 2-4: Conversation State Machine
CREATE TABLE IF NOT EXISTS ai_patient_state (
  id BIGSERIAL PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  patient_id VARCHAR(50) NOT NULL,
  current_state VARCHAR(50) NOT NULL,
  state_confidence NUMERIC(5,4) DEFAULT 1.0,
  state_source VARCHAR(30) DEFAULT 'system',
  context JSONB DEFAULT '{}',
  last_transition_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE (tenant_id, patient_id)
);
ALTER TABLE ai_patient_state ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'ai_patient_state' AND policyname = 'service_role_full_access'
  ) THEN
    CREATE POLICY service_role_full_access ON ai_patient_state
      FOR ALL TO service_role USING (auth.role() = 'service_role');
  END IF;
END $$;
CREATE INDEX IF NOT EXISTS idx_ai_patient_state_lookup ON ai_patient_state(tenant_id, patient_id);

CREATE TABLE IF NOT EXISTS ai_patient_state_history (
  id BIGSERIAL PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  patient_id VARCHAR(50) NOT NULL,
  from_state VARCHAR(50),
  to_state VARCHAR(50) NOT NULL,
  trigger_type VARCHAR(30) NOT NULL,
  trigger_payload JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE ai_patient_state_history ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'ai_patient_state_history' AND policyname = 'service_role_full_access'
  ) THEN
    CREATE POLICY service_role_full_access ON ai_patient_state_history
      FOR ALL TO service_role USING (auth.role() = 'service_role');
  END IF;
END $$;

-- Phase 3-1: Tool Use
ALTER TABLE ai_reply_drafts
  ADD COLUMN IF NOT EXISTS tool_calls JSONB DEFAULT '[]';
ALTER TABLE ai_reply_settings
  ADD COLUMN IF NOT EXISTS tool_use_enabled BOOLEAN DEFAULT false;

-- Phase 3-2: Multimodal
ALTER TABLE ai_reply_drafts
  ADD COLUMN IF NOT EXISTS image_urls TEXT[] DEFAULT '{}';
ALTER TABLE ai_reply_settings
  ADD COLUMN IF NOT EXISTS image_reply_enabled BOOLEAN DEFAULT false;

-- Phase 3-3: Trace / Replay
CREATE TABLE IF NOT EXISTS ai_reply_traces (
  id BIGSERIAL PRIMARY KEY,
  tenant_id UUID REFERENCES tenants(id),
  draft_id BIGINT REFERENCES ai_reply_drafts(id) ON DELETE CASCADE,
  patient_id VARCHAR(50),
  rewritten_query TEXT,
  classification_result JSONB DEFAULT '{}',
  policy_decision JSONB DEFAULT '{}',
  candidate_examples JSONB DEFAULT '[]',
  reranked_examples JSONB DEFAULT '[]',
  candidate_chunks JSONB DEFAULT '[]',
  tool_calls JSONB DEFAULT '[]',
  patient_state_snapshot JSONB DEFAULT '{}',
  prompt_hash TEXT,
  model_name TEXT,
  model_response_raw TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE ai_reply_traces ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'ai_reply_traces' AND policyname = 'service_role_full_access'
  ) THEN
    CREATE POLICY service_role_full_access ON ai_reply_traces
      FOR ALL TO service_role USING (auth.role() = 'service_role');
  END IF;
END $$;
CREATE INDEX IF NOT EXISTS idx_ai_reply_traces_draft ON ai_reply_traces(draft_id);

-- Phase 3-4: Auto Optimization
CREATE TABLE IF NOT EXISTS ai_reply_experiments (
  id BIGSERIAL PRIMARY KEY,
  tenant_id UUID REFERENCES tenants(id),
  experiment_name TEXT NOT NULL,
  config JSONB NOT NULL,
  traffic_ratio NUMERIC(5,4) DEFAULT 0.5,
  status VARCHAR(20) NOT NULL DEFAULT 'draft',
  started_at TIMESTAMPTZ,
  ended_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE ai_reply_experiments ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'ai_reply_experiments' AND policyname = 'service_role_full_access'
  ) THEN
    CREATE POLICY service_role_full_access ON ai_reply_experiments
      FOR ALL TO service_role USING (auth.role() = 'service_role');
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS ai_reply_experiment_assignments (
  id BIGSERIAL PRIMARY KEY,
  tenant_id UUID REFERENCES tenants(id),
  draft_id BIGINT REFERENCES ai_reply_drafts(id) ON DELETE CASCADE,
  experiment_id BIGINT REFERENCES ai_reply_experiments(id) ON DELETE CASCADE,
  variant_key TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE ai_reply_experiment_assignments ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'ai_reply_experiment_assignments' AND policyname = 'service_role_full_access'
  ) THEN
    CREATE POLICY service_role_full_access ON ai_reply_experiment_assignments
      FOR ALL TO service_role USING (auth.role() = 'service_role');
  END IF;
END $$;
CREATE INDEX IF NOT EXISTS idx_experiments_tenant ON ai_reply_experiments(tenant_id, status);
