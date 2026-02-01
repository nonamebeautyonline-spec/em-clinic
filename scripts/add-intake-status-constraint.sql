-- scripts/add-intake-status-constraint.sql
-- intakeテーブルのstatusカラムにCHECK制約を追加して、不正な値を防ぐ

-- まず、現在の異常値を修正（pending → NULL）
UPDATE intake
SET status = NULL
WHERE status = 'pending';

-- ⬇️ 修正後、以下を実行 ⬇️

-- CHECK制約を追加（status は NULL または 'OK' または 'NG' のみ許可）
ALTER TABLE intake
ADD CONSTRAINT intake_status_check
CHECK (status IS NULL OR status IN ('OK', 'NG'));

-- 制約の確認
SELECT conname, contype, pg_get_constraintdef(oid)
FROM pg_constraint
WHERE conrelid = 'intake'::regclass
AND conname = 'intake_status_check';

-- これで以下のような不正な挿入/更新は全て失敗するようになります：
-- UPDATE intake SET status = 'pending' WHERE patient_id = '...'  ← エラー！
-- UPDATE intake SET status = 'canceled' WHERE patient_id = '...' ← エラー！
-- UPDATE intake SET status = 'foo' WHERE patient_id = '...'      ← エラー！

-- 許可される値のみ成功：
-- UPDATE intake SET status = NULL WHERE patient_id = '...'       ← OK
-- UPDATE intake SET status = 'OK' WHERE patient_id = '...'       ← OK
-- UPDATE intake SET status = 'NG' WHERE patient_id = '...'       ← OK
