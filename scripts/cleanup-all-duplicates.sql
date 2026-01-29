-- 重複予約の一括削除（最新の予約のみ残す）
-- 各患者の最新予約のみを残して、他を削除

-- 1. patient_id: 20260101381 (12件 → 1件)
-- 保持: resv-1769676831803 (最新)
DELETE FROM reservations
WHERE patient_id = '20260101381'
AND reserve_id != 'resv-1769676831803';

UPDATE intake
SET reserve_id = 'resv-1769676831803',
    reserved_date = '2026-01-30',
    reserved_time = NULL
WHERE patient_id = '20260101381';

-- 2. patient_id: 20260101529 (3件 → 1件)
-- 保持: resv-1769687043173 (最新)
DELETE FROM reservations
WHERE patient_id = '20260101529'
AND reserve_id != 'resv-1769687043173';

UPDATE intake
SET reserve_id = 'resv-1769687043173',
    reserved_date = '2026-01-30',
    reserved_time = NULL
WHERE patient_id = '20260101529';

-- 3. patient_id: 20260100132 (2件 → 1件)
-- 保持: resv-1769673647692 (最新)
DELETE FROM reservations
WHERE patient_id = '20260100132'
AND reserve_id != 'resv-1769673647692';

UPDATE intake
SET reserve_id = 'resv-1769673647692',
    reserved_date = '2026-01-30',
    reserved_time = NULL
WHERE patient_id = '20260100132';

-- 4. patient_id: 20260101409 (2件 → 1件)
-- 保持: resv-1769634262054 (最新)
DELETE FROM reservations
WHERE patient_id = '20260101409'
AND reserve_id != 'resv-1769634262054';

UPDATE intake
SET reserve_id = 'resv-1769634262054',
    reserved_date = '2026-02-03',
    reserved_time = NULL
WHERE patient_id = '20260101409';

-- 5. patient_id: 20260101586 (2件 → 1件)
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
SELECT patient_id, COUNT(*) as reservation_count
FROM reservations
WHERE patient_id IN ('20260101381', '20260101529', '20260100132', '20260101409', '20260101586')
GROUP BY patient_id
ORDER BY patient_id;
