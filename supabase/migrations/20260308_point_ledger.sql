-- ポイント制度用テーブル

-- ポイント設定テーブル
CREATE TABLE IF NOT EXISTS point_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL DEFAULT '00000000-0000-0000-0000-000000000001',
  points_per_yen integer NOT NULL DEFAULT 1,
  expiry_months integer NOT NULL DEFAULT 12,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (tenant_id)
);

-- RLS有効化 + service_role_full_access ポリシー
ALTER TABLE point_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY service_role_full_access ON point_settings
  FOR ALL TO service_role
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

-- ポイント台帳テーブル
CREATE TABLE IF NOT EXISTS point_ledger (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL DEFAULT '00000000-0000-0000-0000-000000000001',
  patient_id text NOT NULL,
  amount integer NOT NULL,          -- 正=付与, 負=利用
  balance_after integer NOT NULL,   -- この取引後の残高
  reason text,
  reference_type text CHECK (reference_type IN ('order', 'reorder', 'manual', 'expired')),
  reference_id text,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- RLS有効化 + service_role_full_access ポリシー
ALTER TABLE point_ledger ENABLE ROW LEVEL SECURITY;
CREATE POLICY service_role_full_access ON point_ledger
  FOR ALL TO service_role
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

-- インデックス
CREATE INDEX idx_point_ledger_patient_id ON point_ledger (patient_id);
CREATE INDEX idx_point_ledger_tenant_id ON point_ledger (tenant_id);
CREATE INDEX idx_point_ledger_created_at ON point_ledger (created_at);
CREATE INDEX idx_point_ledger_tenant_patient ON point_ledger (tenant_id, patient_id);
