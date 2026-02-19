-- リマインドルール定義テーブル
CREATE TABLE IF NOT EXISTS reminder_rules (
  id SERIAL PRIMARY KEY,
  tenant_id UUID,
  name VARCHAR(100) NOT NULL,
  timing_type VARCHAR(20) NOT NULL DEFAULT 'before_hours',  -- before_hours / before_days
  timing_value INTEGER NOT NULL DEFAULT 24,                  -- N時間前 or N日前
  message_template TEXT NOT NULL,                             -- メッセージテンプレート（{name}, {date}, {time} 使用可）
  is_enabled BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- リマインド送信ログ（二重送信防止）
CREATE TABLE IF NOT EXISTS reminder_sent_log (
  id SERIAL PRIMARY KEY,
  tenant_id UUID,
  rule_id INTEGER NOT NULL REFERENCES reminder_rules(id) ON DELETE CASCADE,
  reservation_id BIGINT NOT NULL,
  scheduled_message_id INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(rule_id, reservation_id)
);

CREATE INDEX IF NOT EXISTS idx_reminder_rules_tenant ON reminder_rules(tenant_id);
CREATE INDEX IF NOT EXISTS idx_reminder_sent_log_tenant ON reminder_sent_log(tenant_id);
CREATE INDEX IF NOT EXISTS idx_reminder_sent_log_rule ON reminder_sent_log(rule_id);
