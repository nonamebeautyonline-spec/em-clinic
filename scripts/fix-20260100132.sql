-- 20260100132の予約を修正
-- 誤った予約（resv-1769673647692）を削除し、正しい予約（resv-1769673522720）のみ残す

-- 1. 誤った予約を削除
DELETE FROM reservations
WHERE patient_id = '20260100132'
AND reserve_id = 'resv-1769673647692';

-- 2. 正しい予約がpendingになっているか確認・更新
UPDATE reservations
SET status = 'pending'
WHERE patient_id = '20260100132'
AND reserve_id = 'resv-1769673522720';

-- 3. intakeテーブルを正しい値に更新
UPDATE intake
SET reserve_id = 'resv-1769673522720',
    reserved_date = '2026-01-30',
    reserved_time = '17:00'
WHERE patient_id = '20260100132';

-- 確認クエリ
SELECT reserve_id, reserved_date, reserved_time, status
FROM reservations
WHERE patient_id = '20260100132'
ORDER BY created_at DESC;
