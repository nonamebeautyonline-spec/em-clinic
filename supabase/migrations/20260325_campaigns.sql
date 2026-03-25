-- キャンペーン（期間限定セール）テーブル
CREATE TABLE campaigns (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  name TEXT NOT NULL,
  description TEXT DEFAULT '',
  discount_type TEXT NOT NULL DEFAULT 'percent' CHECK (discount_type IN ('percent', 'fixed')),
  discount_value INTEGER NOT NULL DEFAULT 0,
  target_type TEXT NOT NULL DEFAULT 'all' CHECK (target_type IN ('all', 'category', 'specific')),
  target_ids UUID[] DEFAULT '{}',
  target_category TEXT DEFAULT '',
  starts_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  ends_at TIMESTAMPTZ,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 個別患者割引テーブル
CREATE TABLE patient_discounts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  patient_id VARCHAR(20) NOT NULL,
  product_id UUID REFERENCES products(id),
  discount_type TEXT NOT NULL DEFAULT 'percent' CHECK (discount_type IN ('percent', 'fixed')),
  discount_value INTEGER NOT NULL DEFAULT 0,
  reason TEXT DEFAULT '',
  valid_until TIMESTAMPTZ,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- RLS
ALTER TABLE campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE patient_discounts ENABLE ROW LEVEL SECURITY;

CREATE POLICY service_role_full_access_campaigns ON campaigns
  FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY service_role_full_access_patient_discounts ON patient_discounts
  FOR ALL USING (auth.role() = 'service_role');

-- インデックス
CREATE INDEX idx_campaigns_tenant ON campaigns(tenant_id);
CREATE INDEX idx_campaigns_active ON campaigns(tenant_id, is_active) WHERE is_active = true;
CREATE INDEX idx_patient_discounts_tenant ON patient_discounts(tenant_id);
CREATE INDEX idx_patient_discounts_patient ON patient_discounts(tenant_id, patient_id);
