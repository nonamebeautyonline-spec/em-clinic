-- KPI目標設定テーブル
-- 月別の目標値を管理し、ダッシュボードで実績と比較表示する

CREATE TABLE IF NOT EXISTS kpi_targets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL DEFAULT '00000000-0000-0000-0000-000000000001',
  metric_type VARCHAR(50) NOT NULL,
  target_value NUMERIC NOT NULL,
  period VARCHAR(20) NOT NULL DEFAULT 'monthly',
  year_month VARCHAR(7) NOT NULL,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(tenant_id, metric_type, period, year_month)
);

-- metric_type の想定値:
--   revenue        : 売上目標（円）
--   new_patients   : 新規患者数
--   reservations   : 予約数
--   paid_count     : 決済完了数
--   repeat_rate    : リピート率（%）
--   payment_rate   : 診療後決済率（%）

-- RLS有効化
ALTER TABLE kpi_targets ENABLE ROW LEVEL SECURITY;

-- service_role のみフルアクセス
CREATE POLICY service_role_full_access ON kpi_targets
  FOR ALL
  USING (auth.role() = 'service_role');

-- updated_at 自動更新トリガー
CREATE OR REPLACE FUNCTION update_kpi_targets_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = 'public'
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_kpi_targets_updated_at
  BEFORE UPDATE ON kpi_targets
  FOR EACH ROW
  EXECUTE FUNCTION update_kpi_targets_updated_at();

-- インデックス
CREATE INDEX idx_kpi_targets_tenant_month ON kpi_targets(tenant_id, year_month);
