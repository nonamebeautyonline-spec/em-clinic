-- 残りの重複予約を削除（3人、合計12件削除）
-- 実行前に必ず確認してください

-- 1. patient_id: 20260101381 (11件 → 1件)
-- 保持: resv-1769676831803 (最新)
DELETE FROM reservations
WHERE patient_id = '20260101381'
AND reserve_id != 'resv-1769676831803';

UPDATE intake
SET reserve_id = 'resv-1769676831803',
    reserved_date = '2026-01-30',
    reserved_time = NULL
WHERE patient_id = '20260101381';

-- 2. patient_id: 20260100132 (2件 → 1件)
-- 保持: resv-1769673647692 (最新)
DELETE FROM reservations
WHERE patient_id = '20260100132'
AND reserve_id != 'resv-1769673647692';

UPDATE intake
SET reserve_id = 'resv-1769673647692',
    reserved_date = '2026-01-30',
    reserved_time = NULL
WHERE patient_id = '20260100132';

-- 3. patient_id: 20260101586 (2件 → 1件)
-- 保持: resv-1769657541061 (最新)
DELETE FROM reservations
WHERE patient_id = '20260101586'
AND reserve_id != 'resv-1769657541061';

UPDATE intake
SET reserve_id = 'resv-1769657541061',
    reserved_date = '2026-01-30',
    reserved_time = NULL
WHERE patient_id = '20260101586';

-- 確認クエリ
SELECT
  patient_id,
  reserve_id,
  reserved_date,
  status,
  created_at
FROM reservations
WHERE patient_id IN ('20260101381', '20260100132', '20260101586')
ORDER BY patient_id, created_at DESC;
