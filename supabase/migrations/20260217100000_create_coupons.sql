-- クーポン定義テーブル
CREATE TABLE IF NOT EXISTS coupons (
  id SERIAL PRIMARY KEY,
  tenant_id UUID,
  name VARCHAR(100) NOT NULL,
  code VARCHAR(50) NOT NULL,
  discount_type VARCHAR(20) NOT NULL DEFAULT 'fixed', -- fixed | percent
  discount_value INTEGER NOT NULL DEFAULT 0,           -- 固定額(円) or 割引率(%)
  min_purchase INTEGER DEFAULT 0,                      -- 最低利用金額
  max_uses INTEGER DEFAULT NULL,                       -- 全体の利用上限（NULLは無制限）
  max_uses_per_patient INTEGER DEFAULT 1,              -- 1患者あたりの利用上限
  valid_from TIMESTAMPTZ DEFAULT NOW(),
  valid_until TIMESTAMPTZ DEFAULT NULL,                -- NULLは無期限
  is_active BOOLEAN DEFAULT true,
  description TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- クーポン配布・利用記録
CREATE TABLE IF NOT EXISTS coupon_issues (
  id SERIAL PRIMARY KEY,
  tenant_id UUID,
  coupon_id INTEGER NOT NULL REFERENCES coupons(id) ON DELETE CASCADE,
  patient_id VARCHAR(20) NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'issued',  -- issued | used | expired
  issued_at TIMESTAMPTZ DEFAULT NOW(),
  used_at TIMESTAMPTZ DEFAULT NULL,
  order_id VARCHAR(50) DEFAULT NULL,              -- 利用した注文ID
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- インデックス
CREATE INDEX IF NOT EXISTS idx_coupons_tenant ON coupons(tenant_id);
CREATE INDEX IF NOT EXISTS idx_coupons_code ON coupons(code);
CREATE INDEX IF NOT EXISTS idx_coupon_issues_tenant ON coupon_issues(tenant_id);
CREATE INDEX IF NOT EXISTS idx_coupon_issues_coupon_id ON coupon_issues(coupon_id);
CREATE INDEX IF NOT EXISTS idx_coupon_issues_patient_id ON coupon_issues(patient_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_coupon_issues_unique ON coupon_issues(coupon_id, patient_id, status) WHERE status = 'issued';
