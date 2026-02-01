-- scripts/fix-20260100576-status.sql
-- patient 20260100576 の status を "pending" から NULL に変更

-- 現在の値を確認
SELECT patient_id, patient_name, reserve_id, status, reserved_date
FROM intake
WHERE patient_id = '20260100576';

-- ⬇️ 実行結果を確認後、以下を実行してください ⬇️

-- statusをNULLに変更（未診状態に戻す）
UPDATE intake
SET status = NULL
WHERE patient_id = '20260100576';

-- 変更後を確認
SELECT patient_id, patient_name, reserve_id, status, reserved_date
FROM intake
WHERE patient_id = '20260100576';
