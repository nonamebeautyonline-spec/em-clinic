-- orders テーブルに発送通知送信日時カラムを追加
-- 通知未送信の発送済み注文を判定するために使用
ALTER TABLE orders ADD COLUMN IF NOT EXISTS notify_shipped_at TIMESTAMPTZ DEFAULT NULL;

-- 発送済み＆通知未送信の検索用インデックス
CREATE INDEX IF NOT EXISTS idx_orders_notify_pending
  ON orders (shipping_date, tenant_id)
  WHERE shipping_status = 'shipped'
    AND tracking_number IS NOT NULL
    AND notify_shipped_at IS NULL;
