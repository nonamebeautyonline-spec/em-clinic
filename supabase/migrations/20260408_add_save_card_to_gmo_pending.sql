-- gmo_pending_orders に save_card カラム追加
-- TradedCard方式でのカード保存フラグ（3DS認証後にカード保存するかどうか）
ALTER TABLE gmo_pending_orders ADD COLUMN IF NOT EXISTS save_card BOOLEAN DEFAULT false;
