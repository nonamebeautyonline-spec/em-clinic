-- AI返信設定にモデル選択カラムを追加
ALTER TABLE ai_reply_settings ADD COLUMN IF NOT EXISTS model_id TEXT DEFAULT 'claude-sonnet-4-6';
