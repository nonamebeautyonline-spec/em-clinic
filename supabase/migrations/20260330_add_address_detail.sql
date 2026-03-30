-- orders テーブルに address_detail カラムを追加
-- 配送先住所の「丁目以降」部分を保存し、前回住所再利用時のzipcloud再分割を不要にする
ALTER TABLE orders ADD COLUMN IF NOT EXISTS address_detail TEXT;

COMMENT ON COLUMN orders.address_detail IS '住所の丁目以降（addressDetail）。前回住所再利用時にzipcloud再分割せず直接使う';
