-- add-call-status-column.sql
-- intakeテーブルに call_status と call_status_updated_at カラムを追加

ALTER TABLE intake
ADD COLUMN IF NOT EXISTS call_status TEXT,
ADD COLUMN IF NOT EXISTS call_status_updated_at TIMESTAMPTZ;

-- インデックスを追加（検索パフォーマンス向上）
CREATE INDEX IF NOT EXISTS idx_intake_call_status ON intake(call_status) WHERE call_status IS NOT NULL;

-- コメントを追加
COMMENT ON COLUMN intake.call_status IS '架電ステータス: no_answer（不通）など';
COMMENT ON COLUMN intake.call_status_updated_at IS '架電ステータスの更新日時';
