-- ブロードキャスト配信の一時停止/再開機能
-- paused_at: 一時停止した日時（NULLなら停止していない）
ALTER TABLE broadcasts ADD COLUMN IF NOT EXISTS paused_at TIMESTAMPTZ;
