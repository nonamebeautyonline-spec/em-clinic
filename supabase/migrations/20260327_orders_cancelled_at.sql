-- orders テーブルに cancelled_at カラムを追加
-- キャンセル日時（支払い前キャンセル・二重入力等）と返金日時（refunded_at）を分離管理
ALTER TABLE orders ADD COLUMN IF NOT EXISTS cancelled_at TIMESTAMPTZ;

-- cancelled_at にインデックス（キャンセル済み注文の検索用）
CREATE INDEX IF NOT EXISTS idx_orders_cancelled_at ON orders (cancelled_at) WHERE cancelled_at IS NOT NULL;
