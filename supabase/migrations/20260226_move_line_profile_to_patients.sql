-- intake.line_display_name / line_picture_url を patients テーブルに移行

-- 1. patients にカラム追加
ALTER TABLE patients ADD COLUMN IF NOT EXISTS line_display_name TEXT;
ALTER TABLE patients ADD COLUMN IF NOT EXISTS line_picture_url TEXT;

-- 2. 既存データを intake から patients に転記（最新の intake レコードを使用）
UPDATE patients p
SET
  line_display_name = sub.line_display_name,
  line_picture_url = sub.line_picture_url
FROM (
  SELECT DISTINCT ON (patient_id)
    patient_id, line_display_name, line_picture_url
  FROM intake
  WHERE line_display_name IS NOT NULL OR line_picture_url IS NOT NULL
  ORDER BY patient_id, created_at DESC
) sub
WHERE p.patient_id = sub.patient_id
  AND p.line_display_name IS NULL;

-- 3. intake から廃止カラムを削除
ALTER TABLE intake DROP COLUMN IF EXISTS line_display_name;
ALTER TABLE intake DROP COLUMN IF EXISTS line_picture_url;

-- 4. answerers VIEW を再作成（patients のカラム変更を反映）
DROP VIEW IF EXISTS answerers;
CREATE VIEW answerers AS SELECT * FROM patients;
