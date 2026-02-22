-- medical_vocabulary テーブル作成（音声認識 医療辞書管理用）
CREATE TABLE IF NOT EXISTS medical_vocabulary (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id text,
  term text NOT NULL,
  reading text,
  category text DEFAULT 'general',
  specialty text DEFAULT 'common',
  boost_weight numeric DEFAULT 1.5,
  is_default boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- インデックス
CREATE INDEX IF NOT EXISTS idx_medical_vocab_tenant ON medical_vocabulary(tenant_id);
CREATE INDEX IF NOT EXISTS idx_medical_vocab_specialty ON medical_vocabulary(specialty);
CREATE INDEX IF NOT EXISTS idx_medical_vocab_category ON medical_vocabulary(category);

-- 同一テナント内で同じ用語の重複防止
CREATE UNIQUE INDEX IF NOT EXISTS idx_medical_vocab_unique_term
  ON medical_vocabulary(tenant_id, term, specialty)
  WHERE tenant_id IS NOT NULL;

-- updated_at 自動更新トリガー
CREATE OR REPLACE FUNCTION update_medical_vocabulary_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_medical_vocabulary_updated_at ON medical_vocabulary;
CREATE TRIGGER trg_medical_vocabulary_updated_at
  BEFORE UPDATE ON medical_vocabulary
  FOR EACH ROW
  EXECUTE FUNCTION update_medical_vocabulary_updated_at();

-- RLS有効化
ALTER TABLE medical_vocabulary ENABLE ROW LEVEL SECURITY;
