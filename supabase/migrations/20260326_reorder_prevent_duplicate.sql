-- 再処方の二重申請をDBレベルで防止する部分ユニークインデックス
-- 同一患者・同一テナントで pending または confirmed の申請は1件のみ許可
CREATE UNIQUE INDEX IF NOT EXISTS idx_reorders_one_active_per_patient
ON reorders (patient_id, tenant_id)
WHERE status IN ('pending', 'confirmed');

-- reorder_number のユニーク制約（同一テナント内で一意）
-- ※適用前に重複データの修正が必要（既存の重複は2026-03-26に修正済み）
CREATE UNIQUE INDEX IF NOT EXISTS idx_reorders_unique_number
ON reorders (reorder_number, tenant_id);
