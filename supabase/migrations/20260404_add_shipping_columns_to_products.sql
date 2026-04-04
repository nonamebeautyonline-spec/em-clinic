-- productsテーブルに発送関連カラムを追加
-- shipping_delay_days: 発送遅延日数（0=通常便/当日発送、10=予約便/10日後発送）
-- cool_type: 温度帯（NULL=テナントデフォルト、normal=常温、chilled=冷蔵、frozen=冷凍）
-- shipping_item_name: 発送ラベル用品名（NULLならテナントデフォルトのitemNameを使用）

ALTER TABLE products ADD COLUMN IF NOT EXISTS shipping_delay_days INTEGER DEFAULT 0;
ALTER TABLE products ADD COLUMN IF NOT EXISTS cool_type VARCHAR(10) DEFAULT NULL;
ALTER TABLE products ADD COLUMN IF NOT EXISTS shipping_item_name TEXT DEFAULT NULL;

-- cool_typeのバリデーション
ALTER TABLE products ADD CONSTRAINT products_cool_type_check
  CHECK (cool_type IS NULL OR cool_type IN ('normal', 'chilled', 'frozen'));

COMMENT ON COLUMN products.shipping_delay_days IS '発送遅延日数（0=通常便、N=N日後発送）';
COMMENT ON COLUMN products.cool_type IS '温度帯（NULL=テナントデフォルト、normal/chilled/frozen）';
COMMENT ON COLUMN products.shipping_item_name IS '発送ラベル用品名（NULLならテナント設定を使用）';
