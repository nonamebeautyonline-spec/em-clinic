-- scripts/fix-intake-pending-status.sql
-- intakeテーブルの status = 'pending' を NULL に修正

-- 現在の状態を確認
SELECT patient_id, patient_name, reserved_date, status
FROM intake
WHERE status = 'pending'
ORDER BY reserved_date;

-- 実行結果（2件）:
-- 20251200229 | 久保田紗月 | 2026-03-05 | pending
-- 20260100576 | 土屋雅裕 | 2026-01-30 | pending

-- ⬇️ 確認後、以下を実行 ⬇️

-- status を NULL に変更（未診状態に戻す）
UPDATE intake
SET status = NULL
WHERE status = 'pending';

-- 変更後を確認（2件が NULL になっているはず）
SELECT patient_id, patient_name, reserved_date, status
FROM intake
WHERE patient_id IN ('20251200229', '20260100576');
