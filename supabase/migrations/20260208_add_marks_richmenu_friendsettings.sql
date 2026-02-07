-- 対応マーク定義マスター（カスタマイズ可能な対応マーク）
CREATE TABLE IF NOT EXISTS mark_definitions (
  id SERIAL PRIMARY KEY,
  value VARCHAR(50) NOT NULL UNIQUE,
  label VARCHAR(100) NOT NULL,
  color VARCHAR(7) NOT NULL DEFAULT '#6B7280',
  icon VARCHAR(10) DEFAULT '●',
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- デフォルト対応マーク挿入
INSERT INTO mark_definitions (value, label, color, icon, sort_order) VALUES
  ('none', 'なし', '#FFFFFF', '○', 0),
  ('red', '未対応', '#EF4444', '●', 1),
  ('yellow', '対応中', '#EAB308', '●', 2),
  ('green', '対応済み', '#22C55E', '●', 3),
  ('blue', '重要', '#3B82F6', '●', 4),
  ('gray', '保留', '#6B7280', '●', 5)
ON CONFLICT (value) DO NOTHING;

-- 友達追加時設定
CREATE TABLE IF NOT EXISTS friend_add_settings (
  id SERIAL PRIMARY KEY,
  setting_key VARCHAR(100) NOT NULL UNIQUE,
  setting_value JSONB NOT NULL DEFAULT '{}',
  enabled BOOLEAN DEFAULT TRUE,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- デフォルト友達追加時設定
INSERT INTO friend_add_settings (setting_key, setting_value, enabled) VALUES
  ('new_friend', '{"greeting_message":"友だち追加ありがとうございます！","assign_tags":[],"assign_mark":"none","actions":[]}', TRUE),
  ('returning_blocked', '{"greeting_message":"おかえりなさい！再度友だち追加ありがとうございます。","assign_tags":[],"assign_mark":"none","actions":[]}', TRUE)
ON CONFLICT (setting_key) DO NOTHING;

-- リッチメニュー管理
CREATE TABLE IF NOT EXISTS rich_menus (
  id SERIAL PRIMARY KEY,
  name VARCHAR(200) NOT NULL,
  chat_bar_text VARCHAR(200) DEFAULT 'メニュー',
  selected BOOLEAN DEFAULT FALSE,
  size_type VARCHAR(20) DEFAULT 'full',
  areas JSONB NOT NULL DEFAULT '[]',
  image_url TEXT,
  line_rich_menu_id VARCHAR(100),
  is_active BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- テンプレートカテゴリ管理（フォルダ分け用）
CREATE TABLE IF NOT EXISTS template_categories (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL UNIQUE,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- デフォルトカテゴリ
INSERT INTO template_categories (name, sort_order) VALUES
  ('未分類', 0)
ON CONFLICT (name) DO NOTHING;

-- インデックス
CREATE INDEX IF NOT EXISTS idx_mark_definitions_sort ON mark_definitions(sort_order);
CREATE INDEX IF NOT EXISTS idx_rich_menus_active ON rich_menus(is_active);
CREATE INDEX IF NOT EXISTS idx_template_categories_sort ON template_categories(sort_order);

-- RLSポリシー
ALTER TABLE mark_definitions ENABLE ROW LEVEL SECURITY;
ALTER TABLE friend_add_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE rich_menus ENABLE ROW LEVEL SECURITY;
ALTER TABLE template_categories ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN CREATE POLICY "service_role_only" ON mark_definitions FOR ALL USING (auth.role() = 'service_role'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY "service_role_only" ON friend_add_settings FOR ALL USING (auth.role() = 'service_role'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY "service_role_only" ON rich_menus FOR ALL USING (auth.role() = 'service_role'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY "service_role_only" ON template_categories FOR ALL USING (auth.role() = 'service_role'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
