え、何が起きてるの-- 翌月予約の早期開放設定テーブル
-- 管理者が毎月5日より前に翌月予約を開放する場合に使用

CREATE TABLE IF NOT EXISTS booking_open_settings (
  id SERIAL PRIMARY KEY,
  target_month VARCHAR(7) NOT NULL UNIQUE,  -- YYYY-MM形式（例: 2026-03）
  is_open BOOLEAN DEFAULT TRUE,
  opened_at TIMESTAMPTZ DEFAULT NOW(),
  opened_by VARCHAR(100),  -- 開放した管理者（オプション）
  memo TEXT
);

-- インデックス
CREATE INDEX IF NOT EXISTS idx_booking_open_month ON booking_open_settings(target_month);

-- コメント
COMMENT ON TABLE booking_open_settings IS '翌月予約の早期開放設定。通常は毎月5日に自動開放だが、管理者が早めに開放したい場合にレコードを追加する';
COMMENT ON COLUMN booking_open_settings.target_month IS '開放対象の月（YYYY-MM形式）';
COMMENT ON COLUMN booking_open_settings.is_open IS '開放状態（true=開放済み）';
