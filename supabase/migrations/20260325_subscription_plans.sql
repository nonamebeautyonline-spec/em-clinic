-- 定期請求プランマスタ
CREATE TABLE subscription_plans (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  name TEXT NOT NULL,
  product_id UUID REFERENCES products(id),
  interval_months INTEGER NOT NULL DEFAULT 1,
  price INTEGER NOT NULL,
  discount_percent INTEGER DEFAULT 0,
  trial_days INTEGER DEFAULT 0,
  max_cycles INTEGER,
  gateway TEXT NOT NULL DEFAULT 'square' CHECK (gateway IN ('square', 'gmo')),
  gateway_plan_id TEXT,
  is_active BOOLEAN DEFAULT true,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 患者のサブスクリプション状態
CREATE TABLE patient_subscriptions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  patient_id VARCHAR(20) NOT NULL,
  plan_id UUID NOT NULL REFERENCES subscription_plans(id),
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'paused', 'cancelled', 'expired')),
  gateway TEXT NOT NULL DEFAULT 'square',
  gateway_subscription_id TEXT,
  current_cycle INTEGER DEFAULT 1,
  next_billing_at TIMESTAMPTZ,
  started_at TIMESTAMPTZ DEFAULT now(),
  cancelled_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- RLS
ALTER TABLE subscription_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE patient_subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY service_role_full_access_subscription_plans ON subscription_plans
  FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY service_role_full_access_patient_subscriptions ON patient_subscriptions
  FOR ALL USING (auth.role() = 'service_role');

-- インデックス
CREATE INDEX idx_subscription_plans_tenant ON subscription_plans(tenant_id);
CREATE INDEX idx_patient_subscriptions_tenant ON patient_subscriptions(tenant_id);
CREATE INDEX idx_patient_subscriptions_patient ON patient_subscriptions(tenant_id, patient_id);
CREATE INDEX idx_patient_subscriptions_status ON patient_subscriptions(tenant_id, status) WHERE status = 'active';
CREATE INDEX idx_patient_subscriptions_billing ON patient_subscriptions(next_billing_at) WHERE status = 'active';
