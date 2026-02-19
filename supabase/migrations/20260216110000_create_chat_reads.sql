-- 既読タイムスタンプ管理（全アカウント共有）
CREATE TABLE IF NOT EXISTS chat_reads (
  patient_id VARCHAR(20) PRIMARY KEY,
  read_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE chat_reads ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  CREATE POLICY "service_role_only" ON chat_reads FOR ALL USING (auth.role() = 'service_role');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- 全既存患者を既読にする（初期化）
INSERT INTO chat_reads (patient_id, read_at)
SELECT DISTINCT patient_id, NOW()
FROM intake
WHERE patient_id IS NOT NULL
ON CONFLICT (patient_id) DO NOTHING;
