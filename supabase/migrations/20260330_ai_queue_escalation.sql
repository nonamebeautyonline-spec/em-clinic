-- AI Queue & Escalation & Semantic Cache
-- キュールーティング・アサイン・セマンティックキャッシュ機能

-- ai_tasks にキュー・アサイン・エスカレーション関連カラム追加
ALTER TABLE ai_tasks
  ADD COLUMN IF NOT EXISTS queue_name VARCHAR(50),
  ADD COLUMN IF NOT EXISTS assignee_id TEXT,
  ADD COLUMN IF NOT EXISTS assigned_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS assigned_by TEXT,
  ADD COLUMN IF NOT EXISTS priority INT DEFAULT 50,
  ADD COLUMN IF NOT EXISTS escalation_level INT DEFAULT 0,
  ADD COLUMN IF NOT EXISTS missing_info JSONB DEFAULT '[]';

CREATE INDEX IF NOT EXISTS idx_ai_tasks_queue ON ai_tasks(queue_name, priority, created_at);
CREATE INDEX IF NOT EXISTS idx_ai_tasks_assignee ON ai_tasks(assignee_id, status);

-- セマンティックキャッシュテーブル
CREATE TABLE IF NOT EXISTS ai_semantic_cache (
  id BIGSERIAL PRIMARY KEY,
  tenant_id UUID REFERENCES tenants(id),
  intent_hash VARCHAR(64) NOT NULL,
  original_input JSONB NOT NULL,
  cached_output JSONB NOT NULL,
  workflow_type TEXT NOT NULL,
  hit_count INT DEFAULT 0,
  quality_score NUMERIC(5,4) DEFAULT 1.0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS idx_semantic_cache_lookup ON ai_semantic_cache(tenant_id, intent_hash);
ALTER TABLE ai_semantic_cache ENABLE ROW LEVEL SECURITY;
CREATE POLICY service_role_full_access ON ai_semantic_cache FOR ALL USING (auth.role() = 'service_role') WITH CHECK (auth.role() = 'service_role');
