-- answerers テーブル作成（問診マスター）
-- GASの問診マスターシートと同じデータ構造

CREATE TABLE IF NOT EXISTS answerers (
  id BIGSERIAL PRIMARY KEY,
  patient_id TEXT UNIQUE NOT NULL,
  answerer_id TEXT,
  line_id TEXT,
  name TEXT,
  name_kana TEXT,
  sex TEXT,
  birthday TEXT,
  tel TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- インデックス作成
CREATE INDEX IF NOT EXISTS idx_answerers_patient_id ON answerers(patient_id);
CREATE INDEX IF NOT EXISTS idx_answerers_answerer_id ON answerers(answerer_id);
CREATE INDEX IF NOT EXISTS idx_answerers_line_id ON answerers(line_id);

-- RLS (Row Level Security) ポリシー
ALTER TABLE answerers ENABLE ROW LEVEL SECURITY;

-- 全ユーザーが読み取り可能
CREATE POLICY "Enable read access for all users" ON answerers
  FOR SELECT
  USING (true);

-- 匿名ユーザーが作成・更新可能
CREATE POLICY "Enable insert for anon users" ON answerers
  FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Enable update for anon users" ON answerers
  FOR UPDATE
  USING (true)
  WITH CHECK (true);

-- updated_at自動更新トリガー
CREATE OR REPLACE FUNCTION update_answerers_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_answerers_updated_at
  BEFORE UPDATE ON answerers
  FOR EACH ROW
  EXECUTE FUNCTION update_answerers_updated_at();

-- コメント
COMMENT ON TABLE answerers IS '問診マスター - LINE認証時に登録される個人情報';
COMMENT ON COLUMN answerers.patient_id IS '患者ID（PRIMARY KEY）';
COMMENT ON COLUMN answerers.answerer_id IS 'KARTE API answerer_id';
COMMENT ON COLUMN answerers.line_id IS 'LINE User ID';
COMMENT ON COLUMN answerers.name IS '氏名';
COMMENT ON COLUMN answerers.name_kana IS '氏名（カナ）';
COMMENT ON COLUMN answerers.sex IS '性別';
COMMENT ON COLUMN answerers.birthday IS '生年月日';
COMMENT ON COLUMN answerers.tel IS '電話番号';
