-- 在庫アラート（閾値通知）機能
-- products テーブルにアラート設定カラム追加
ALTER TABLE products ADD COLUMN IF NOT EXISTS stock_alert_threshold INTEGER;
ALTER TABLE products ADD COLUMN IF NOT EXISTS stock_alert_enabled BOOLEAN NOT NULL DEFAULT false;

-- アラート履歴テーブル作成（重複通知防止用）
CREATE TABLE IF NOT EXISTS inventory_alerts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID REFERENCES tenants(id),
  product_id UUID REFERENCES products(id) ON DELETE CASCADE,
  current_stock INTEGER NOT NULL,
  threshold INTEGER NOT NULL,
  resolved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE inventory_alerts ENABLE ROW LEVEL SECURITY;

CREATE POLICY service_role_full_access ON inventory_alerts
  FOR ALL
  USING (auth.role() = 'service_role');

CREATE INDEX idx_inventory_alerts_tenant ON inventory_alerts(tenant_id);
CREATE INDEX idx_inventory_alerts_product ON inventory_alerts(product_id);
CREATE INDEX idx_inventory_alerts_unresolved ON inventory_alerts(tenant_id, resolved_at) WHERE resolved_at IS NULL;
