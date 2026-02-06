-- reordersテーブルにLINE通知結果カラムを追加
ALTER TABLE reorders
  ADD COLUMN IF NOT EXISTS line_notify_result TEXT;

COMMENT ON COLUMN reorders.line_notify_result IS 'LINE通知結果: sent / no_uid / failed / NULL(未送信)';
