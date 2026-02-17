-- reminder_rules に固定時刻送信関連カラムを追加
ALTER TABLE reminder_rules
  ADD COLUMN IF NOT EXISTS send_hour INTEGER,             -- 送信時刻（時）0-23
  ADD COLUMN IF NOT EXISTS send_minute INTEGER DEFAULT 0, -- 送信時刻（分）0-59
  ADD COLUMN IF NOT EXISTS target_day_offset INTEGER DEFAULT 1, -- 0=当日, 1=前日（翌日の予約）
  ADD COLUMN IF NOT EXISTS message_format VARCHAR(10) DEFAULT 'text'; -- 'text' | 'flex'

-- scheduled_messages に FLEX JSON を追加
ALTER TABLE scheduled_messages
  ADD COLUMN IF NOT EXISTS flex_json JSONB;
