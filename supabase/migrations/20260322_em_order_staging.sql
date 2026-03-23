-- EMオンラインクリニック 決済データ照合用ステージングテーブル
-- 決済CSVを仮投入し、電話番号照合でpatient_idを紐付けた後にordersへ本投入する

CREATE TABLE IF NOT EXISTS em_order_staging (
  id SERIAL PRIMARY KEY,
  source_phone TEXT,               -- 元の電話番号（CSV値そのまま）
  source_phone_normalized TEXT,    -- normalizeJPPhone済み
  source_name_raw TEXT,            -- 元の氏名（CSV値そのまま）
  source_name TEXT,                -- cleanEmName済み
  source_email TEXT,               -- メールアドレス
  source_postal TEXT,              -- 郵便番号
  source_address TEXT,             -- 住所
  product_name TEXT,               -- 商品名
  amount INTEGER,                  -- 金額
  paid_at TIMESTAMPTZ,             -- 決済日時
  csv_year INTEGER,                -- CSVファイルの年（2024/2025/2026）
  matched_patient_id TEXT,         -- 照合結果（NULL=未マッチ）
  match_type TEXT,                 -- 'phone_exact'/'phone_multi'/'phone_fuzzy'/'email_only'/'manual'/NULL
  match_score NUMERIC,             -- 照合スコア（0-100）
  match_detail TEXT,               -- 照合の詳細メモ（距離値、候補数等）
  tenant_id UUID NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- インデックス
CREATE INDEX IF NOT EXISTS idx_em_staging_phone ON em_order_staging (source_phone_normalized);
CREATE INDEX IF NOT EXISTS idx_em_staging_email ON em_order_staging (source_email);
CREATE INDEX IF NOT EXISTS idx_em_staging_tenant ON em_order_staging (tenant_id);
CREATE INDEX IF NOT EXISTS idx_em_staging_match ON em_order_staging (matched_patient_id);

-- RLSポリシー
ALTER TABLE em_order_staging ENABLE ROW LEVEL SECURITY;
CREATE POLICY service_role_full_access ON em_order_staging
  FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');
