-- product_categories にカラーテーマを追加（購入画面のアコーディオン色制御用）
ALTER TABLE product_categories ADD COLUMN IF NOT EXISTS color_theme TEXT DEFAULT NULL;
