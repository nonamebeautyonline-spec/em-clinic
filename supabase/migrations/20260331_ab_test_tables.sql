-- ABテスト配信振り分けテーブル（既存ab_tests/ab_test_variantsに追加）
-- 各患者がどのバリアントに割り当てられたかを記録

CREATE TABLE IF NOT EXISTS ab_test_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  test_id UUID NOT NULL REFERENCES ab_tests(id) ON DELETE CASCADE,
  variant_id UUID NOT NULL REFERENCES ab_test_variants(id) ON DELETE CASCADE,
  patient_id BIGINT NOT NULL REFERENCES patients(id),
  sent_at TIMESTAMPTZ,
  opened_at TIMESTAMPTZ,
  clicked_at TIMESTAMPTZ,
  converted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- RLS + service_roleポリシー
ALTER TABLE ab_test_assignments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "service_role_full_access" ON ab_test_assignments
  FOR ALL TO service_role USING (auth.role() = 'service_role');

-- インデックス
CREATE INDEX IF NOT EXISTS idx_ab_test_assignments_test_id ON ab_test_assignments(test_id);
CREATE INDEX IF NOT EXISTS idx_ab_test_assignments_variant_id ON ab_test_assignments(variant_id);
CREATE INDEX IF NOT EXISTS idx_ab_test_assignments_patient_id ON ab_test_assignments(patient_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_ab_test_assignments_test_patient ON ab_test_assignments(test_id, patient_id);

-- ab_test_variantsにflex_json列を追加（存在しない場合のみ）
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'ab_test_variants' AND column_name = 'flex_json'
  ) THEN
    ALTER TABLE ab_test_variants ADD COLUMN flex_json JSONB;
  END IF;
END$$;
