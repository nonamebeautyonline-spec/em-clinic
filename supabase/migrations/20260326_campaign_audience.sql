-- キャンペーンに利用上限 + 患者ターゲティングカラム追加
ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS max_uses INTEGER DEFAULT NULL;
ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS audience_type TEXT DEFAULT 'all'
  CHECK (audience_type IN ('all', 'specific', 'condition'));
ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS audience_patient_ids TEXT[] DEFAULT '{}';
ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS audience_rules JSONB DEFAULT NULL;

-- クーポンにも同じ対象患者指定カラム追加
ALTER TABLE coupons ADD COLUMN IF NOT EXISTS audience_type TEXT DEFAULT 'all'
  CHECK (audience_type IN ('all', 'specific', 'condition'));
ALTER TABLE coupons ADD COLUMN IF NOT EXISTS audience_patient_ids TEXT[] DEFAULT '{}';
ALTER TABLE coupons ADD COLUMN IF NOT EXISTS audience_rules JSONB DEFAULT NULL;

-- キャンペーン利用記録テーブル
CREATE TABLE campaign_usages (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  campaign_id UUID NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
  patient_id VARCHAR(20) NOT NULL,
  order_id VARCHAR(50),
  used_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS
ALTER TABLE campaign_usages ENABLE ROW LEVEL SECURITY;
CREATE POLICY service_role_full_access_campaign_usages ON campaign_usages
  FOR ALL USING (auth.role() = 'service_role');

-- インデックス
CREATE INDEX idx_campaign_usages_tenant ON campaign_usages(tenant_id);
CREATE INDEX idx_campaign_usages_campaign ON campaign_usages(tenant_id, campaign_id);
CREATE INDEX idx_campaign_usages_patient ON campaign_usages(campaign_id, patient_id);
