-- 同一患者に対して複数のintakeレコード（再処方決済カルテ等）を追加できるよう
-- patient_id のユニーク制約を削除
ALTER TABLE intake DROP CONSTRAINT IF EXISTS intake_patient_id_key;
