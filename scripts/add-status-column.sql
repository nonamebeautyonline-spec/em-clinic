-- ordersテーブルにstatus + 住所カラムを追加
-- Plan A: 銀行振込も含めて全てordersテーブルで管理し、statusで決済確認状態を管理
-- 住所情報もordersに保存することで、DBだけで発送リストを完結させる

-- 1. status カラム追加（決済確認状態）
ALTER TABLE orders ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'confirmed';

-- 2. 住所関連カラム追加
ALTER TABLE orders ADD COLUMN IF NOT EXISTS shipping_name TEXT; -- 配送先氏名（Square: name（配送先）、銀行振込: shipping_name）
ALTER TABLE orders ADD COLUMN IF NOT EXISTS postal_code TEXT;   -- 郵便番号
ALTER TABLE orders ADD COLUMN IF NOT EXISTS address TEXT;        -- 住所
ALTER TABLE orders ADD COLUMN IF NOT EXISTS phone TEXT;          -- 電話番号
ALTER TABLE orders ADD COLUMN IF NOT EXISTS email TEXT;          -- メールアドレス

-- 3. 銀行振込用カラム追加
ALTER TABLE orders ADD COLUMN IF NOT EXISTS account_name TEXT;   -- 振込名義人（銀行振込のみ）

-- コメント追加
COMMENT ON COLUMN orders.status IS '決済確認状態: pending_confirmation=振込確認中, confirmed=確認済み';
COMMENT ON COLUMN orders.shipping_name IS '配送先氏名（漢字）';
COMMENT ON COLUMN orders.postal_code IS '郵便番号（ハイフンなし7桁推奨）';
COMMENT ON COLUMN orders.address IS '住所（都道府県から建物名まで）';
COMMENT ON COLUMN orders.phone IS '電話番号';
COMMENT ON COLUMN orders.email IS 'メールアドレス';
COMMENT ON COLUMN orders.account_name IS '振込名義人（銀行振込のみ、カタカナ）';
