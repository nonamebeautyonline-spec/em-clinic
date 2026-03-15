-- 流入経路トラッキング機能
-- テーブル: tracking_source_folders, tracking_sources, tracking_visits
-- patients テーブルへのカラム追加

-- ─── フォルダ ─────────────────────────────
CREATE TABLE IF NOT EXISTS tracking_source_folders (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  sort_order INTEGER DEFAULT 0,
  tenant_id UUID NOT NULL DEFAULT '00000000-0000-0000-0000-000000000001',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE tracking_source_folders ENABLE ROW LEVEL SECURITY;
CREATE POLICY service_role_full_access ON tracking_source_folders
  FOR ALL USING (auth.role() = 'service_role');

-- ─── 流入経路 ─────────────────────────────
CREATE TABLE IF NOT EXISTS tracking_sources (
  id SERIAL PRIMARY KEY,
  code VARCHAR(20) UNIQUE NOT NULL,
  name VARCHAR(255) NOT NULL,
  folder_id INTEGER REFERENCES tracking_source_folders(id) ON DELETE SET NULL,
  destination_url TEXT NOT NULL,
  qr_display_text VARCHAR(10),
  valid_from TIMESTAMPTZ,
  valid_until TIMESTAMPTZ,
  is_active BOOLEAN DEFAULT true,

  -- アクション設定（既存ActionStep形式）
  action_settings JSONB DEFAULT '{"enabled": false, "steps": []}'::jsonb,
  ignore_friend_add_action BOOLEAN DEFAULT false,
  action_execution VARCHAR(20) DEFAULT 'always',

  -- 広告連携
  utm_defaults JSONB DEFAULT '{}'::jsonb,
  custom_params JSONB DEFAULT '[]'::jsonb,

  -- HTMLタグ
  html_head_tags TEXT,
  html_body_tags TEXT,

  memo TEXT,
  tenant_id UUID NOT NULL DEFAULT '00000000-0000-0000-0000-000000000001',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE tracking_sources ENABLE ROW LEVEL SECURITY;
CREATE POLICY service_role_full_access ON tracking_sources
  FOR ALL USING (auth.role() = 'service_role');

CREATE INDEX IF NOT EXISTS idx_tracking_sources_code ON tracking_sources(code);
CREATE INDEX IF NOT EXISTS idx_tracking_sources_tenant ON tracking_sources(tenant_id);

-- ─── 訪問記録 ─────────────────────────────
CREATE TABLE IF NOT EXISTS tracking_visits (
  id BIGSERIAL PRIMARY KEY,
  source_id INTEGER NOT NULL REFERENCES tracking_sources(id),
  user_agent TEXT,
  ip_address VARCHAR(45),
  referrer TEXT,
  utm_source VARCHAR(200),
  utm_medium VARCHAR(200),
  utm_campaign VARCHAR(200),
  utm_term VARCHAR(200),
  utm_content VARCHAR(200),
  custom_params JSONB DEFAULT '{}'::jsonb,

  -- 紐付け（callback/register時に更新）
  line_uid VARCHAR(100),
  patient_id VARCHAR(50),
  converted_at TIMESTAMPTZ,

  tenant_id UUID NOT NULL DEFAULT '00000000-0000-0000-0000-000000000001',
  visited_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE tracking_visits ENABLE ROW LEVEL SECURITY;
CREATE POLICY service_role_full_access ON tracking_visits
  FOR ALL USING (auth.role() = 'service_role');

CREATE INDEX IF NOT EXISTS idx_tracking_visits_source ON tracking_visits(source_id);
CREATE INDEX IF NOT EXISTS idx_tracking_visits_line_uid ON tracking_visits(line_uid);
CREATE INDEX IF NOT EXISTS idx_tracking_visits_patient ON tracking_visits(patient_id);
CREATE INDEX IF NOT EXISTS idx_tracking_visits_visited ON tracking_visits(visited_at);
CREATE INDEX IF NOT EXISTS idx_tracking_visits_tenant ON tracking_visits(tenant_id);

-- ─── patients カラム追加 ──────────────────────
ALTER TABLE patients ADD COLUMN IF NOT EXISTS tracking_source_id INTEGER REFERENCES tracking_sources(id);
ALTER TABLE patients ADD COLUMN IF NOT EXISTS tracking_visit_id BIGINT REFERENCES tracking_visits(id);
ALTER TABLE patients ADD COLUMN IF NOT EXISTS utm_source VARCHAR(200);
ALTER TABLE patients ADD COLUMN IF NOT EXISTS utm_medium VARCHAR(200);
ALTER TABLE patients ADD COLUMN IF NOT EXISTS utm_campaign VARCHAR(200);
