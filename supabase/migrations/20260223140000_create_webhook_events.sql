-- webhook_events: Webhook/Cron の冪等キー管理テーブル
-- 重複処理防止のためにイベントIDをUNIQUE制約で管理する

CREATE TABLE IF NOT EXISTS webhook_events (
  id BIGSERIAL PRIMARY KEY,
  tenant_id UUID,
  event_source TEXT NOT NULL,       -- 'square', 'gmo', 'send_reminder' 等
  event_id TEXT NOT NULL,           -- 外部イベントID or 自前生成キー
  status TEXT NOT NULL DEFAULT 'processing', -- 'processing', 'completed', 'failed'
  payload JSONB,                    -- デバッグ用にイベント情報を保存
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ,
  UNIQUE(event_source, event_id)
);

-- クリーンアップ用（30日以上前のレコードを定期削除する際に使用）
CREATE INDEX idx_webhook_events_cleanup ON webhook_events(created_at);
