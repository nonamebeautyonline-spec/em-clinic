-- ordersテーブルに発送オプションカラムを追加
-- 購入画面で顧客が選択し、CSVエクスポート時に参照

-- 差出人名変更（NULLならテナントデフォルト）
ALTER TABLE orders ADD COLUMN IF NOT EXISTS custom_sender_name TEXT DEFAULT NULL;

-- 品名を「化粧品」に変更（九州は陸送になる旨の注意あり、沖縄+冷蔵は不可）
ALTER TABLE orders ADD COLUMN IF NOT EXISTS item_name_cosmetics BOOLEAN DEFAULT false;

-- ヘキシジン使用（アルコールアレルギー対応、注射商品のみ）
ALTER TABLE orders ADD COLUMN IF NOT EXISTS use_hexidin BOOLEAN DEFAULT false;

-- 郵便局留め
ALTER TABLE orders ADD COLUMN IF NOT EXISTS post_office_hold BOOLEAN DEFAULT false;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS post_office_name TEXT DEFAULT NULL;

COMMENT ON COLUMN orders.custom_sender_name IS '差出人名変更（NULLならテナントデフォルト）';
COMMENT ON COLUMN orders.item_name_cosmetics IS '品名を化粧品に変更';
COMMENT ON COLUMN orders.use_hexidin IS 'ヘキシジン使用（アルコールアレルギー対応）';
COMMENT ON COLUMN orders.post_office_hold IS '郵便局留め';
COMMENT ON COLUMN orders.post_office_name IS '郵便局名（留め置き時のみ）';
