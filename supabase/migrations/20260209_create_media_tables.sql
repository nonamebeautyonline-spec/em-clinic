-- 登録メディア フォルダ管理
CREATE TABLE IF NOT EXISTS media_folders (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- デフォルトフォルダ
INSERT INTO media_folders (name, sort_order) VALUES
  ('未分類', 0)
ON CONFLICT DO NOTHING;

-- 登録メディア ファイル管理
CREATE TABLE IF NOT EXISTS media_files (
  id SERIAL PRIMARY KEY,
  name VARCHAR(200) NOT NULL,
  file_url TEXT NOT NULL,
  file_type VARCHAR(20) NOT NULL CHECK (file_type IN ('image', 'menu_image', 'pdf')),
  mime_type VARCHAR(100),
  file_size INTEGER,
  folder_id INTEGER REFERENCES media_folders(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- インデックス
CREATE INDEX IF NOT EXISTS idx_media_files_folder ON media_files(folder_id);
CREATE INDEX IF NOT EXISTS idx_media_files_type ON media_files(file_type);
CREATE INDEX IF NOT EXISTS idx_media_folders_sort ON media_folders(sort_order);

-- RLSポリシー
ALTER TABLE media_folders ENABLE ROW LEVEL SECURITY;
ALTER TABLE media_files ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN CREATE POLICY "service_role_only" ON media_folders FOR ALL USING (auth.role() = 'service_role'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY "service_role_only" ON media_files FOR ALL USING (auth.role() = 'service_role'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
