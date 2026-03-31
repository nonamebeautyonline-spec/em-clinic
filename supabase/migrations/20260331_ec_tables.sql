-- EC特化テーブル

-- ECサブスクリプション
CREATE TABLE IF NOT EXISTS ec_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  patient_id BIGINT NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  stripe_subscription_id TEXT UNIQUE,
  product_id UUID REFERENCES products(id) ON DELETE SET NULL,
  interval TEXT NOT NULL DEFAULT 'monthly',
  status TEXT DEFAULT 'active',
  next_billing_date DATE,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_ec_subscriptions_tenant ON ec_subscriptions(tenant_id);
CREATE INDEX IF NOT EXISTS idx_ec_subscriptions_patient ON ec_subscriptions(patient_id);
ALTER TABLE ec_subscriptions ENABLE ROW LEVEL SECURITY;
CREATE POLICY service_role_full_access ON ec_subscriptions FOR ALL USING (auth.role() = 'service_role');

-- カゴ落ちトラッキング
CREATE TABLE IF NOT EXISTS abandoned_carts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  patient_id BIGINT REFERENCES patients(id) ON DELETE SET NULL,
  line_uid TEXT,
  cart_items JSONB NOT NULL DEFAULT '[]',
  cart_total INT DEFAULT 0,
  abandoned_at TIMESTAMPTZ DEFAULT now(),
  reminder_count INT DEFAULT 0,
  recovered_at TIMESTAMPTZ,
  source TEXT DEFAULT 'custom'
);
CREATE INDEX IF NOT EXISTS idx_abandoned_carts_tenant ON abandoned_carts(tenant_id);
CREATE INDEX IF NOT EXISTS idx_abandoned_carts_abandoned_at ON abandoned_carts(abandoned_at);
ALTER TABLE abandoned_carts ENABLE ROW LEVEL SECURITY;
CREATE POLICY service_role_full_access ON abandoned_carts FOR ALL USING (auth.role() = 'service_role');

-- EC外部連携設定
CREATE TABLE IF NOT EXISTS ec_integrations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  platform TEXT NOT NULL,
  shop_domain TEXT,
  api_key_encrypted TEXT,
  webhook_secret TEXT,
  is_active BOOLEAN DEFAULT true,
  last_synced_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(tenant_id, platform)
);
CREATE INDEX IF NOT EXISTS idx_ec_integrations_tenant ON ec_integrations(tenant_id);
ALTER TABLE ec_integrations ENABLE ROW LEVEL SECURITY;
CREATE POLICY service_role_full_access ON ec_integrations FOR ALL USING (auth.role() = 'service_role');
