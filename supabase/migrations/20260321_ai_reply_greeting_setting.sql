-- 挨拶・お礼メッセージへのAI返信を有効/無効にする設定
ALTER TABLE ai_reply_settings ADD COLUMN IF NOT EXISTS greeting_reply_enabled BOOLEAN NOT NULL DEFAULT false;
COMMENT ON COLUMN ai_reply_settings.greeting_reply_enabled IS '挨拶・お礼メッセージにもAI返信を生成するかどうか';
