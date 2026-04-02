-- 3DSチャレンジフロー用: 決済完了前のオーダー情報を一時保存
CREATE TABLE IF NOT EXISTS gmo_pending_orders (
  order_id TEXT PRIMARY KEY,
  access_id TEXT NOT NULL,
  access_pass TEXT NOT NULL,
  patient_id TEXT NOT NULL,
  product_code TEXT NOT NULL,
  product_name TEXT,
  amount INTEGER NOT NULL,
  mode TEXT,
  reorder_id TEXT,
  shipping JSONB,
  tenant_id UUID DEFAULT '00000000-0000-0000-0000-000000000001',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  -- 30分で自動期限切れ（クリーンアップ用）
  expires_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '30 minutes')
);

ALTER TABLE gmo_pending_orders ENABLE ROW LEVEL SECURITY;
CREATE POLICY service_role_full_access ON gmo_pending_orders FOR ALL USING (auth.role() = 'service_role');

CREATE INDEX idx_gmo_pending_orders_expires ON gmo_pending_orders(expires_at);

COMMENT ON TABLE gmo_pending_orders IS 'GMO 3DSチャレンジフロー用の一時テーブル。認証完了後にordersにINSERTして削除';
