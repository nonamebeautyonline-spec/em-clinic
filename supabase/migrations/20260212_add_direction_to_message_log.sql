-- message_log に direction 列を追加（送信/受信の区別）
ALTER TABLE message_log ADD COLUMN IF NOT EXISTS direction VARCHAR(10) DEFAULT 'outgoing';
-- outgoing = こちらから送信, incoming = ユーザーから受信

-- 受信メッセージのメタ情報
ALTER TABLE message_log ADD COLUMN IF NOT EXISTS event_type VARCHAR(20);
-- message, postback, follow, unfollow など

-- postback の場合のアクションデータ
ALTER TABLE message_log ADD COLUMN IF NOT EXISTS postback_data JSONB;

-- インデックス
CREATE INDEX IF NOT EXISTS idx_message_log_direction ON message_log(direction);
CREATE INDEX IF NOT EXISTS idx_message_log_event_type ON message_log(event_type);
CREATE INDEX IF NOT EXISTS idx_message_log_line_uid ON message_log(line_uid);
