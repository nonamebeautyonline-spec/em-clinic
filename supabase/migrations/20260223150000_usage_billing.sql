-- 従量課金制移行: テーブル追加・カラム追加
-- 実行日: 2026-02-23

-- 1. tenant_plans にメッセージクォータ・Stripe関連カラムを追加
ALTER TABLE tenant_plans ADD COLUMN IF NOT EXISTS message_quota INT DEFAULT 5000;
ALTER TABLE tenant_plans ADD COLUMN IF NOT EXISTS overage_unit_price NUMERIC(10,2) DEFAULT 1.0;
ALTER TABLE tenant_plans ADD COLUMN IF NOT EXISTS stripe_subscription_id TEXT;
ALTER TABLE tenant_plans ADD COLUMN IF NOT EXISTS stripe_customer_id TEXT;

-- 2. tenant_options テーブル（AIオプション課金管理）
CREATE TABLE IF NOT EXISTS tenant_options (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  option_key TEXT NOT NULL,
  monthly_price INT NOT NULL,
  is_active BOOLEAN DEFAULT true,
  stripe_subscription_item_id TEXT,
  activated_at TIMESTAMPTZ DEFAULT now(),
  deactivated_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(tenant_id, option_key)
);

-- tenant_options のインデックス
CREATE INDEX IF NOT EXISTS idx_tenant_options_tenant_id ON tenant_options(tenant_id);
CREATE INDEX IF NOT EXISTS idx_tenant_options_active ON tenant_options(tenant_id, is_active) WHERE is_active = true;

-- 3. monthly_usage テーブル（月次使用量集計）
CREATE TABLE IF NOT EXISTS monthly_usage (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  month DATE NOT NULL,
  message_count INT DEFAULT 0,
  broadcast_count INT DEFAULT 0,
  overage_count INT DEFAULT 0,
  overage_amount INT DEFAULT 0,
  reported_to_stripe BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(tenant_id, month)
);

-- monthly_usage のインデックス
CREATE INDEX IF NOT EXISTS idx_monthly_usage_tenant_month ON monthly_usage(tenant_id, month DESC);

-- 4. RLS ポリシー（tenant_options）
ALTER TABLE tenant_options ENABLE ROW LEVEL SECURITY;

CREATE POLICY "tenant_options_select" ON tenant_options
  FOR SELECT USING (true);

CREATE POLICY "tenant_options_insert" ON tenant_options
  FOR INSERT WITH CHECK (true);

CREATE POLICY "tenant_options_update" ON tenant_options
  FOR UPDATE USING (true);

-- 5. RLS ポリシー（monthly_usage）
ALTER TABLE monthly_usage ENABLE ROW LEVEL SECURITY;

CREATE POLICY "monthly_usage_select" ON monthly_usage
  FOR SELECT USING (true);

CREATE POLICY "monthly_usage_insert" ON monthly_usage
  FOR INSERT WITH CHECK (true);

CREATE POLICY "monthly_usage_update" ON monthly_usage
  FOR UPDATE USING (true);
