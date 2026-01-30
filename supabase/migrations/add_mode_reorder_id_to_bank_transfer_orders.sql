-- Add mode and reorder_id columns to bank_transfer_orders table
-- Supports both initial purchase and reorder with bank transfer

ALTER TABLE bank_transfer_orders
  ADD COLUMN IF NOT EXISTS mode TEXT,
  ADD COLUMN IF NOT EXISTS reorder_id TEXT;

-- Add index for reorder_id
CREATE INDEX IF NOT EXISTS idx_bank_transfer_orders_reorder_id
  ON bank_transfer_orders(reorder_id)
  WHERE reorder_id IS NOT NULL;

-- Comments
COMMENT ON COLUMN bank_transfer_orders.mode IS 'first: 初回購入, current: 今回診察分, reorder: 再購入';
COMMENT ON COLUMN bank_transfer_orders.reorder_id IS '再購入申請ID (再購入の場合のみ)';
