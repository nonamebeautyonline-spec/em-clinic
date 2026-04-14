-- テナント内表示用PID（P0000001形式、7桁ゼロ埋め）
-- 既存patient_idはFK参照としてそのまま維持

-- 1. pidカラム追加
ALTER TABLE patients ADD COLUMN IF NOT EXISTS pid TEXT;

-- 2. テナント内ユニーク制約（NULLは許可 = LINE_仮IDはpid未設定）
CREATE UNIQUE INDEX IF NOT EXISTS idx_patients_tenant_pid
  ON patients (tenant_id, pid) WHERE pid IS NOT NULL;

-- 3. 既存患者に一括採番（テナントごとにcreated_at順）
-- LINE_仮IDにはpidを振らない
WITH numbered AS (
  SELECT id, tenant_id,
    ROW_NUMBER() OVER (PARTITION BY tenant_id ORDER BY created_at, id) AS seq
  FROM patients
  WHERE patient_id NOT LIKE 'LINE_%'
    AND pid IS NULL
)
UPDATE patients p
SET pid = 'P' || LPAD(n.seq::text, 7, '0')
FROM numbered n
WHERE p.id = n.id;

-- 4. 採番RPC（テナント内MAX+1）
CREATE OR REPLACE FUNCTION next_tenant_pid(p_tenant_id uuid)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  max_seq int;
  next_seq int;
BEGIN
  -- 現在のテナント内最大連番を取得
  SELECT COALESCE(MAX(SUBSTRING(pid FROM 2)::int), 0)
  INTO max_seq
  FROM patients
  WHERE tenant_id = p_tenant_id
    AND pid IS NOT NULL
    AND pid ~ '^P\d+$';

  next_seq := max_seq + 1;
  RETURN 'P' || LPAD(next_seq::text, 7, '0');
END;
$$;
