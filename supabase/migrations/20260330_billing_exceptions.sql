-- 請求例外操作用カラム・テーブル追加
-- 実行日: 2026-03-30

-- tenant_plans に請求保留・値引きカラム追加
ALTER TABLE tenant_plans ADD COLUMN IF NOT EXISTS billing_hold BOOLEAN DEFAULT false;
ALTER TABLE tenant_plans ADD COLUMN IF NOT EXISTS billing_hold_reason TEXT;
ALTER TABLE tenant_plans ADD COLUMN IF NOT EXISTS discount_percent NUMERIC(5,2);
ALTER TABLE tenant_plans ADD COLUMN IF NOT EXISTS discount_expires_at TIMESTAMPTZ;

-- クレジット（値引き）管理テーブル
CREATE TABLE IF NOT EXISTS billing_credits (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  amount INT NOT NULL,
  reason TEXT,
  applied_by TEXT,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'applied', 'cancelled')),
  applied_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- RLS有効化
ALTER TABLE billing_credits ENABLE ROW LEVEL SECURITY;

-- service_role フルアクセス
CREATE POLICY "service_role_full_access" ON billing_credits
  FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

-- インデックス
CREATE INDEX IF NOT EXISTS idx_billing_credits_tenant ON billing_credits(tenant_id);
CREATE INDEX IF NOT EXISTS idx_billing_credits_status ON billing_credits(status);
