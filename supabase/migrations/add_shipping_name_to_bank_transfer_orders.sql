-- bank_transfer_orders テーブルに配送先氏名カラムを追加

ALTER TABLE bank_transfer_orders
ADD COLUMN shipping_name TEXT;

COMMENT ON COLUMN bank_transfer_orders.shipping_name IS '配送先氏名（漢字）';
