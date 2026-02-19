-- inventory_logs テーブル: 日次棚卸し記録（箱単位）
-- section: 'box'=箱在庫, 'packaged'=梱包済み
-- item_key: 箱在庫→'box_2.5mg'等, 梱包済み→product.id, 移行プラン→'transition_1'等
DROP TABLE IF EXISTS inventory_logs;
CREATE TABLE inventory_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID,
  product_id UUID REFERENCES products(id) ON DELETE CASCADE,
  item_key TEXT NOT NULL,
  section TEXT NOT NULL DEFAULT 'packaged',
  location TEXT NOT NULL DEFAULT '本院',
  logged_date DATE NOT NULL,
  box_count INT NOT NULL DEFAULT 0,
  shipped_count INT NOT NULL DEFAULT 0,
  note TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(tenant_id, item_key, logged_date, location)
);

CREATE INDEX IF NOT EXISTS idx_inventory_logs_tenant_date
  ON inventory_logs(tenant_id, logged_date DESC);
