-- products テーブル: 商品マスタ（マルチテナント対応）
CREATE TABLE IF NOT EXISTS products (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID,
  code TEXT NOT NULL,
  title TEXT NOT NULL,
  drug_name TEXT NOT NULL DEFAULT 'マンジャロ',
  dosage TEXT,
  duration_months INT,
  quantity INT,
  price INT NOT NULL,
  is_active BOOLEAN DEFAULT true,
  sort_order INT DEFAULT 0,
  category TEXT DEFAULT 'injection',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(tenant_id, code)
);

-- tenant_settings テーブル: テナント別設定（暗号化保存）
CREATE TABLE IF NOT EXISTS tenant_settings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID,
  category TEXT NOT NULL,
  key TEXT NOT NULL,
  value TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(tenant_id, category, key)
);

-- 既存12商品のシードデータ
INSERT INTO products (code, title, drug_name, dosage, duration_months, quantity, price, sort_order, category) VALUES
  ('MJL_2.5mg_1m', 'マンジャロ 2.5mg 1ヶ月', 'マンジャロ', '2.5mg', 1, 4, 13000, 1, 'injection'),
  ('MJL_2.5mg_2m', 'マンジャロ 2.5mg 2ヶ月', 'マンジャロ', '2.5mg', 2, 8, 25500, 2, 'injection'),
  ('MJL_2.5mg_3m', 'マンジャロ 2.5mg 3ヶ月', 'マンジャロ', '2.5mg', 3, 12, 35000, 3, 'injection'),
  ('MJL_5mg_1m', 'マンジャロ 5mg 1ヶ月', 'マンジャロ', '5mg', 1, 4, 22850, 4, 'injection'),
  ('MJL_5mg_2m', 'マンジャロ 5mg 2ヶ月', 'マンジャロ', '5mg', 2, 8, 45500, 5, 'injection'),
  ('MJL_5mg_3m', 'マンジャロ 5mg 3ヶ月', 'マンジャロ', '5mg', 3, 12, 63000, 6, 'injection'),
  ('MJL_7.5mg_1m', 'マンジャロ 7.5mg 1ヶ月', 'マンジャロ', '7.5mg', 1, 4, 34000, 7, 'injection'),
  ('MJL_7.5mg_2m', 'マンジャロ 7.5mg 2ヶ月', 'マンジャロ', '7.5mg', 2, 8, 65000, 8, 'injection'),
  ('MJL_7.5mg_3m', 'マンジャロ 7.5mg 3ヶ月', 'マンジャロ', '7.5mg', 3, 12, 96000, 9, 'injection'),
  ('MJL_10mg_1m', 'マンジャロ 10mg 1ヶ月', 'マンジャロ', '10mg', 1, 4, 35000, 10, 'injection'),
  ('MJL_10mg_2m', 'マンジャロ 10mg 2ヶ月', 'マンジャロ', '10mg', 2, 8, 70000, 11, 'injection'),
  ('MJL_10mg_3m', 'マンジャロ 10mg 3ヶ月', 'マンジャロ', '10mg', 3, 12, 105000, 12, 'injection')
ON CONFLICT (tenant_id, code) DO NOTHING;
