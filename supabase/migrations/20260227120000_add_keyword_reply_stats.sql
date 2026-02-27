-- キーワード自動応答の効果分析用カラム追加

-- keyword_auto_replies にトリガー回数カウンターを追加
ALTER TABLE keyword_auto_replies ADD COLUMN IF NOT EXISTS trigger_count INTEGER NOT NULL DEFAULT 0;

-- keyword_auto_replies に最終トリガー日時を追加
ALTER TABLE keyword_auto_replies ADD COLUMN IF NOT EXISTS last_triggered_at TIMESTAMPTZ;

-- message_log にキーワードルールIDを追加（どのルールでトリガーされたか追跡）
ALTER TABLE message_log ADD COLUMN IF NOT EXISTS keyword_reply_id INTEGER REFERENCES keyword_auto_replies(id) ON DELETE SET NULL;

-- message_log の keyword_reply_id インデックス
CREATE INDEX IF NOT EXISTS idx_message_log_keyword_reply_id ON message_log(keyword_reply_id) WHERE keyword_reply_id IS NOT NULL;
