-- webhook_events にリプレイ用カラムを追加
ALTER TABLE webhook_events ADD COLUMN IF NOT EXISTS error_message TEXT;
ALTER TABLE webhook_events ADD COLUMN IF NOT EXISTS retry_count INT NOT NULL DEFAULT 0;
ALTER TABLE webhook_events ADD COLUMN IF NOT EXISTS last_retried_at TIMESTAMPTZ;
ALTER TABLE webhook_events ADD COLUMN IF NOT EXISTS original_payload JSONB;

-- 検索用インデックス
CREATE INDEX IF NOT EXISTS idx_webhook_events_status ON webhook_events(status);
CREATE INDEX IF NOT EXISTS idx_webhook_events_source_status ON webhook_events(event_source, status);
