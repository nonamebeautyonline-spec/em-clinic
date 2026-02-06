-- 発送リスト共有用の一時ストレージテーブル
CREATE TABLE IF NOT EXISTS shipping_shares (
  id TEXT PRIMARY KEY,
  data JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL
);

-- 有効期限切れのレコードを自動削除するインデックス
CREATE INDEX IF NOT EXISTS idx_shipping_shares_expires_at ON shipping_shares(expires_at);

-- RLSを無効化（パスワード認証で保護）
ALTER TABLE shipping_shares DISABLE ROW LEVEL SECURITY;

-- 有効期限切れのレコードを削除する関数
CREATE OR REPLACE FUNCTION delete_expired_shipping_shares()
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
  DELETE FROM shipping_shares WHERE expires_at < NOW();
END;
$$;
