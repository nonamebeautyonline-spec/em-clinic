-- キーワード自動応答ルール
CREATE TABLE IF NOT EXISTS keyword_auto_replies (
  id SERIAL PRIMARY KEY,
  name VARCHAR(200) NOT NULL,
  keyword TEXT NOT NULL,
  match_type VARCHAR(20) NOT NULL DEFAULT 'partial',  -- exact | partial | regex
  priority INTEGER NOT NULL DEFAULT 0,
  is_enabled BOOLEAN NOT NULL DEFAULT true,

  -- 応答内容
  reply_type VARCHAR(20) NOT NULL DEFAULT 'text',  -- text | template | action
  reply_text TEXT,
  reply_template_id INTEGER REFERENCES message_templates(id) ON DELETE SET NULL,
  reply_action_id INTEGER REFERENCES actions(id) ON DELETE SET NULL,

  -- 条件フィルタ（タグ・マーク等で絞り込み）
  condition_rules JSONB DEFAULT '[]',

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE keyword_auto_replies ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN CREATE POLICY "service_role_only" ON keyword_auto_replies FOR ALL USING (auth.role() = 'service_role'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE INDEX IF NOT EXISTS idx_keyword_auto_replies_enabled ON keyword_auto_replies (is_enabled, priority DESC);
