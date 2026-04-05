-- orders テーブル: カート式購入対応
-- order_items: カート内の複数商品をJSONBで保存
-- shipping_fee: 配送料（クール便3000/常温550）
-- is_first_purchase: 初回CP適用フラグ

ALTER TABLE orders ADD COLUMN IF NOT EXISTS order_items JSONB DEFAULT NULL;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS shipping_fee INT DEFAULT 0;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS is_first_purchase BOOLEAN DEFAULT false;

-- order_items の構造例:
-- [
--   { "code": "MJL_2.5mg_1m_rsv", "title": "マンジャロ2.5mg 1ヶ月 予約便", "price": 12500, "qty": 1 },
--   { "code": "MET_250mg", "title": "メトホルミン250mg 90錠", "price": 4500, "qty": 1 }
-- ]
