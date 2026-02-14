-- ステップ配信（シナリオ配信）テーブル

-- シナリオ定義
CREATE TABLE IF NOT EXISTS step_scenarios (
  id SERIAL PRIMARY KEY,
  name VARCHAR(200) NOT NULL,
  folder_id INTEGER REFERENCES action_folders(id) ON DELETE SET NULL,

  -- トリガー設定
  trigger_type VARCHAR(20) NOT NULL DEFAULT 'follow',  -- follow | tag_add | keyword | manual
  trigger_tag_id INTEGER REFERENCES tag_definitions(id) ON DELETE SET NULL,
  trigger_keyword TEXT,
  trigger_keyword_match VARCHAR(20) DEFAULT 'partial',  -- exact | partial | regex

  -- 対象条件
  condition_rules JSONB DEFAULT '[]',

  is_enabled BOOLEAN NOT NULL DEFAULT true,

  -- 統計
  total_enrolled INTEGER NOT NULL DEFAULT 0,
  total_completed INTEGER NOT NULL DEFAULT 0,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE step_scenarios ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN CREATE POLICY "service_role_only" ON step_scenarios FOR ALL USING (auth.role() = 'service_role'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE INDEX IF NOT EXISTS idx_step_scenarios_trigger ON step_scenarios (trigger_type, is_enabled);

-- ステップ定義（各メッセージ/アクション）
CREATE TABLE IF NOT EXISTS step_items (
  id SERIAL PRIMARY KEY,
  scenario_id INTEGER NOT NULL REFERENCES step_scenarios(id) ON DELETE CASCADE,
  sort_order INTEGER NOT NULL DEFAULT 0,

  -- 遅延設定
  delay_type VARCHAR(20) NOT NULL DEFAULT 'days',  -- minutes | hours | days
  delay_value INTEGER NOT NULL DEFAULT 1,
  send_time VARCHAR(5),  -- HH:MM（delay_type=days の場合の送信時刻）

  -- アクション内容
  step_type VARCHAR(30) NOT NULL,  -- send_text | send_template | tag_add | tag_remove | mark_change | menu_change
  content TEXT,
  template_id INTEGER REFERENCES message_templates(id) ON DELETE SET NULL,
  tag_id INTEGER REFERENCES tag_definitions(id) ON DELETE SET NULL,
  mark VARCHAR(30),
  menu_id INTEGER,

  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE step_items ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN CREATE POLICY "service_role_only" ON step_items FOR ALL USING (auth.role() = 'service_role'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE INDEX IF NOT EXISTS idx_step_items_scenario ON step_items (scenario_id, sort_order);

-- 対象者進捗管理
CREATE TABLE IF NOT EXISTS step_enrollments (
  id SERIAL PRIMARY KEY,
  scenario_id INTEGER NOT NULL REFERENCES step_scenarios(id) ON DELETE CASCADE,
  patient_id VARCHAR(20) NOT NULL,
  line_uid VARCHAR(100),

  current_step_order INTEGER NOT NULL DEFAULT 0,
  status VARCHAR(20) NOT NULL DEFAULT 'active',  -- active | completed | exited | paused

  -- 次回送信予定
  next_send_at TIMESTAMPTZ,

  enrolled_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  exited_at TIMESTAMPTZ,
  exit_reason VARCHAR(50),  -- blocked | tag_removed | manual | condition_failed

  UNIQUE (scenario_id, patient_id)
);

ALTER TABLE step_enrollments ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN CREATE POLICY "service_role_only" ON step_enrollments FOR ALL USING (auth.role() = 'service_role'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE INDEX IF NOT EXISTS idx_step_enrollments_active ON step_enrollments (status, next_send_at)
  WHERE status = 'active' AND next_send_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_step_enrollments_patient ON step_enrollments (patient_id, status);
