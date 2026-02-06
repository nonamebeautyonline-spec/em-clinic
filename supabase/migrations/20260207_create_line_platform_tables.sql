-- LINE配信プラットフォーム テーブル作成
-- Phase 1: タグ・友達情報・対応マーク・メッセージ履歴
-- Phase 2: 一斉配信・予約送信・テンプレート

-- =============================================
-- Phase 1: CRM基盤
-- =============================================

-- タグ定義マスター
CREATE TABLE IF NOT EXISTS tag_definitions (
  id SERIAL PRIMARY KEY,
  name VARCHAR(50) NOT NULL UNIQUE,
  color VARCHAR(7) DEFAULT '#6B7280',
  description TEXT,
  is_auto BOOLEAN DEFAULT FALSE,
  auto_rule JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 患者×タグ紐付け
CREATE TABLE IF NOT EXISTS patient_tags (
  id SERIAL PRIMARY KEY,
  patient_id VARCHAR(20) NOT NULL,
  tag_id INTEGER NOT NULL REFERENCES tag_definitions(id) ON DELETE CASCADE,
  assigned_at TIMESTAMPTZ DEFAULT NOW(),
  assigned_by VARCHAR(50),
  UNIQUE(patient_id, tag_id)
);

-- 友達情報欄の定義（カスタムフィールド）
CREATE TABLE IF NOT EXISTS friend_field_definitions (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL UNIQUE,
  field_type VARCHAR(20) NOT NULL DEFAULT 'text',
  options JSONB,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 友達情報欄の値（患者×フィールド）
CREATE TABLE IF NOT EXISTS friend_field_values (
  id SERIAL PRIMARY KEY,
  patient_id VARCHAR(20) NOT NULL,
  field_id INTEGER NOT NULL REFERENCES friend_field_definitions(id) ON DELETE CASCADE,
  value TEXT,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(patient_id, field_id)
);

-- 対応マーク（患者ごとの対応状態）
CREATE TABLE IF NOT EXISTS patient_marks (
  patient_id VARCHAR(20) PRIMARY KEY,
  mark VARCHAR(20) NOT NULL DEFAULT 'none',
  note TEXT,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  updated_by VARCHAR(50)
);

-- メッセージ送信履歴
CREATE TABLE IF NOT EXISTS message_log (
  id SERIAL PRIMARY KEY,
  patient_id VARCHAR(20),
  line_uid VARCHAR(100),
  message_type VARCHAR(20) NOT NULL,
  content TEXT NOT NULL,
  status VARCHAR(20) NOT NULL,
  campaign_id INTEGER,
  error_message TEXT,
  sent_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- Phase 2: 配信機能
-- =============================================

-- メッセージテンプレート
CREATE TABLE IF NOT EXISTS message_templates (
  id SERIAL PRIMARY KEY,
  name VARCHAR(200) NOT NULL,
  content TEXT NOT NULL,
  message_type VARCHAR(20) DEFAULT 'text',
  category VARCHAR(50),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 一斉配信履歴
CREATE TABLE IF NOT EXISTS broadcasts (
  id SERIAL PRIMARY KEY,
  name VARCHAR(200),
  filter_rules JSONB NOT NULL,
  message_content TEXT NOT NULL,
  message_type VARCHAR(20) DEFAULT 'text',
  status VARCHAR(20) DEFAULT 'draft',
  scheduled_at TIMESTAMPTZ,
  sent_at TIMESTAMPTZ,
  total_targets INTEGER DEFAULT 0,
  sent_count INTEGER DEFAULT 0,
  failed_count INTEGER DEFAULT 0,
  no_uid_count INTEGER DEFAULT 0,
  created_by VARCHAR(50),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 予約送信キュー
CREATE TABLE IF NOT EXISTS scheduled_messages (
  id SERIAL PRIMARY KEY,
  patient_id VARCHAR(20) NOT NULL,
  line_uid VARCHAR(100),
  message_content TEXT NOT NULL,
  message_type VARCHAR(20) DEFAULT 'text',
  scheduled_at TIMESTAMPTZ NOT NULL,
  status VARCHAR(20) DEFAULT 'scheduled',
  sent_at TIMESTAMPTZ,
  error_message TEXT,
  created_by VARCHAR(50),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- インデックス
-- =============================================

CREATE INDEX IF NOT EXISTS idx_patient_tags_patient ON patient_tags(patient_id);
CREATE INDEX IF NOT EXISTS idx_patient_tags_tag ON patient_tags(tag_id);
CREATE INDEX IF NOT EXISTS idx_friend_field_values_patient ON friend_field_values(patient_id);
CREATE INDEX IF NOT EXISTS idx_friend_field_values_field ON friend_field_values(field_id);
CREATE INDEX IF NOT EXISTS idx_patient_marks_mark ON patient_marks(mark);
CREATE INDEX IF NOT EXISTS idx_message_log_patient ON message_log(patient_id);
CREATE INDEX IF NOT EXISTS idx_message_log_sent_at ON message_log(sent_at DESC);
CREATE INDEX IF NOT EXISTS idx_message_log_campaign ON message_log(campaign_id);
CREATE INDEX IF NOT EXISTS idx_broadcasts_status ON broadcasts(status);
CREATE INDEX IF NOT EXISTS idx_scheduled_status_time ON scheduled_messages(status, scheduled_at);
CREATE INDEX IF NOT EXISTS idx_message_templates_category ON message_templates(category);

-- =============================================
-- RLSポリシー（管理者のみアクセス）
-- =============================================

ALTER TABLE tag_definitions ENABLE ROW LEVEL SECURITY;
ALTER TABLE patient_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE friend_field_definitions ENABLE ROW LEVEL SECURITY;
ALTER TABLE friend_field_values ENABLE ROW LEVEL SECURITY;
ALTER TABLE patient_marks ENABLE ROW LEVEL SECURITY;
ALTER TABLE message_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE message_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE broadcasts ENABLE ROW LEVEL SECURITY;
ALTER TABLE scheduled_messages ENABLE ROW LEVEL SECURITY;

-- service_roleでのみアクセス可能（管理APIはsupabaseAdminを使用）
CREATE POLICY "service_role_only" ON tag_definitions FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "service_role_only" ON patient_tags FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "service_role_only" ON friend_field_definitions FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "service_role_only" ON friend_field_values FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "service_role_only" ON patient_marks FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "service_role_only" ON message_log FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "service_role_only" ON message_templates FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "service_role_only" ON broadcasts FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "service_role_only" ON scheduled_messages FOR ALL USING (auth.role() = 'service_role');
