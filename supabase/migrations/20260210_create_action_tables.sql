-- アクション管理テーブル
CREATE TABLE IF NOT EXISTS action_folders (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE action_folders ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN CREATE POLICY "service_role_only" ON action_folders FOR ALL USING (auth.role() = 'service_role'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- デフォルトフォルダ
INSERT INTO action_folders (name, sort_order) VALUES ('未分類', 0) ON CONFLICT DO NOTHING;

CREATE TABLE IF NOT EXISTS actions (
  id SERIAL PRIMARY KEY,
  name VARCHAR(200) NOT NULL,
  folder_id INTEGER REFERENCES action_folders(id) ON DELETE SET NULL,
  steps JSONB NOT NULL DEFAULT '[]',
  repeat_enabled BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE actions ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN CREATE POLICY "service_role_only" ON actions FOR ALL USING (auth.role() = 'service_role'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE INDEX IF NOT EXISTS idx_actions_folder ON actions(folder_id);
