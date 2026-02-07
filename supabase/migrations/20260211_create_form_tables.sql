-- 回答フォームビルダー テーブル

-- フォームフォルダ管理
CREATE TABLE IF NOT EXISTS form_folders (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE form_folders ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN CREATE POLICY "service_role_only" ON form_folders FOR ALL USING (auth.role() = 'service_role'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

INSERT INTO form_folders (name, sort_order) VALUES ('未分類', 0) ON CONFLICT DO NOTHING;

-- フォーム定義
CREATE TABLE IF NOT EXISTS forms (
  id SERIAL PRIMARY KEY,
  name VARCHAR(200) NOT NULL,
  folder_id INTEGER REFERENCES form_folders(id) ON DELETE SET NULL,
  slug VARCHAR(100) UNIQUE,
  title VARCHAR(200) NOT NULL DEFAULT '',
  description TEXT,
  fields JSONB NOT NULL DEFAULT '[]',
  settings JSONB NOT NULL DEFAULT '{}'::jsonb,
  is_published BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE forms ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN CREATE POLICY "service_role_only" ON forms FOR ALL USING (auth.role() = 'service_role'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE INDEX IF NOT EXISTS idx_forms_folder ON forms(folder_id);
CREATE INDEX IF NOT EXISTS idx_forms_slug ON forms(slug);
CREATE INDEX IF NOT EXISTS idx_forms_published ON forms(is_published);

-- 回答データ
CREATE TABLE IF NOT EXISTS form_responses (
  id SERIAL PRIMARY KEY,
  form_id INTEGER NOT NULL REFERENCES forms(id) ON DELETE CASCADE,
  patient_id VARCHAR(20),
  line_user_id VARCHAR(100),
  respondent_name VARCHAR(100),
  answers JSONB NOT NULL DEFAULT '{}'::jsonb,
  ip_address INET,
  user_agent TEXT,
  submitted_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE form_responses ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN CREATE POLICY "service_role_only" ON form_responses FOR ALL USING (auth.role() = 'service_role'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE INDEX IF NOT EXISTS idx_form_responses_form ON form_responses(form_id);
CREATE INDEX IF NOT EXISTS idx_form_responses_patient ON form_responses(patient_id);
CREATE INDEX IF NOT EXISTS idx_form_responses_line ON form_responses(line_user_id);
CREATE INDEX IF NOT EXISTS idx_form_responses_submitted ON form_responses(submitted_at DESC);

-- ファイル添付
CREATE TABLE IF NOT EXISTS form_file_uploads (
  id SERIAL PRIMARY KEY,
  response_id INTEGER REFERENCES form_responses(id) ON DELETE CASCADE,
  field_id VARCHAR(50) NOT NULL,
  file_name VARCHAR(500) NOT NULL,
  file_url TEXT NOT NULL,
  file_size INTEGER,
  mime_type VARCHAR(100),
  uploaded_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE form_file_uploads ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN CREATE POLICY "service_role_only" ON form_file_uploads FOR ALL USING (auth.role() = 'service_role'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE INDEX IF NOT EXISTS idx_form_file_uploads_response ON form_file_uploads(response_id);
