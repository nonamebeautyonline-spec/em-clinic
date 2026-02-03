-- 月次経理データテーブル
CREATE TABLE IF NOT EXISTS monthly_financials (
  id SERIAL PRIMARY KEY,
  year_month VARCHAR(7) NOT NULL UNIQUE, -- YYYY-MM format

  -- 売上
  net_sales INTEGER DEFAULT 0, -- 純売上高（システムから自動取得も可能）

  -- 売上原価
  drug_purchase INTEGER DEFAULT 0, -- 薬品仕入高
  cost_of_goods_sold INTEGER DEFAULT 0, -- 売上原価（計算値 or 直接入力）

  -- 販売費及び一般管理費
  personnel_expense INTEGER DEFAULT 0, -- 販管人件費
  advertising_expense INTEGER DEFAULT 0, -- 広告宣伝費
  packaging_shipping INTEGER DEFAULT 0, -- 荷造運賃
  outsourcing_cost INTEGER DEFAULT 0, -- 外注費
  rent INTEGER DEFAULT 0, -- 賃借料
  repairs INTEGER DEFAULT 0, -- 修繕費
  supplies INTEGER DEFAULT 0, -- 消耗品費
  utilities INTEGER DEFAULT 0, -- 水道光熱費
  travel_expense INTEGER DEFAULT 0, -- 旅費交通費
  contractor_fee INTEGER DEFAULT 0, -- 業務委託費
  taxes_duties INTEGER DEFAULT 0, -- 租税公課
  entertainment INTEGER DEFAULT 0, -- 交際接待費
  insurance INTEGER DEFAULT 0, -- 保険料
  communication INTEGER DEFAULT 0, -- 通信費
  membership_fee INTEGER DEFAULT 0, -- 諸会費
  processing_fee INTEGER DEFAULT 0, -- 支払手数料
  miscellaneous INTEGER DEFAULT 0, -- 雑費

  -- メモ
  notes TEXT,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- インデックス
CREATE INDEX IF NOT EXISTS idx_monthly_financials_year_month ON monthly_financials(year_month);
