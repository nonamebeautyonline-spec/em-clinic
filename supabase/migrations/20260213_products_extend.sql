-- 商品テーブル拡張: 画像・在庫・割引・説明・親子関係
ALTER TABLE products ADD COLUMN IF NOT EXISTS image_url text;
ALTER TABLE products ADD COLUMN IF NOT EXISTS stock_quantity integer;
ALTER TABLE products ADD COLUMN IF NOT EXISTS discount_price integer;
ALTER TABLE products ADD COLUMN IF NOT EXISTS discount_until timestamptz;
ALTER TABLE products ADD COLUMN IF NOT EXISTS description text;
ALTER TABLE products ADD COLUMN IF NOT EXISTS parent_id uuid REFERENCES products(id) ON DELETE SET NULL;

-- 親子関係検索用インデックス
CREATE INDEX IF NOT EXISTS idx_products_parent_id ON products(parent_id);

COMMENT ON COLUMN products.image_url IS '商品画像URL';
COMMENT ON COLUMN products.stock_quantity IS '在庫数（NULLは無制限）';
COMMENT ON COLUMN products.discount_price IS '割引価格（NULLは割引なし）';
COMMENT ON COLUMN products.discount_until IS '割引期限（NULLは無期限）';
COMMENT ON COLUMN products.description IS '商品説明';
COMMENT ON COLUMN products.parent_id IS '親商品ID（バリエーション管理用）';
