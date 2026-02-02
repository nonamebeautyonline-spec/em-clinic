-- Add shipping_list_created_at to track when order was added to a shipping list
ALTER TABLE orders ADD COLUMN IF NOT EXISTS shipping_list_created_at TIMESTAMPTZ DEFAULT NULL;

-- Index for filtering orders by list creation status
CREATE INDEX IF NOT EXISTS idx_orders_shipping_list_created_at ON orders(shipping_list_created_at);
