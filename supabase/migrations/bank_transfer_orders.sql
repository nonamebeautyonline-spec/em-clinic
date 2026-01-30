-- bank_transfer_orders テーブル作成
-- 銀行振込での注文情報を管理

CREATE TABLE IF NOT EXISTS bank_transfer_orders (
  id BIGSERIAL PRIMARY KEY,
  patient_id TEXT NOT NULL,
  product_code TEXT NOT NULL,
  account_name TEXT NOT NULL,
  phone_number TEXT NOT NULL,
  email TEXT NOT NULL,
  postal_code TEXT NOT NULL,
  address TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending_confirmation',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  submitted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  confirmed_at TIMESTAMPTZ,
  shipped_at TIMESTAMPTZ,
  notes TEXT
);

-- インデックス作成
CREATE INDEX IF NOT EXISTS idx_bank_transfer_orders_patient_id ON bank_transfer_orders(patient_id);
CREATE INDEX IF NOT EXISTS idx_bank_transfer_orders_status ON bank_transfer_orders(status);
CREATE INDEX IF NOT EXISTS idx_bank_transfer_orders_created_at ON bank_transfer_orders(created_at DESC);

-- RLS有効化
ALTER TABLE bank_transfer_orders ENABLE ROW LEVEL SECURITY;

-- RLSポリシー：患者は自分のレコードのみ閲覧可能
CREATE POLICY "Users can view their own bank transfer orders"
  ON bank_transfer_orders
  FOR SELECT
  USING (auth.uid()::text = patient_id OR auth.role() = 'service_role');

-- RLSポリシー：すべてのユーザーが挿入可能（匿名も含む）
CREATE POLICY "Anyone can insert bank transfer orders"
  ON bank_transfer_orders
  FOR INSERT
  WITH CHECK (true);

-- RLSポリシー：管理者のみ更新可能
CREATE POLICY "Service role can update bank transfer orders"
  ON bank_transfer_orders
  FOR UPDATE
  USING (auth.role() = 'service_role');

-- updated_at自動更新トリガー
CREATE OR REPLACE FUNCTION update_bank_transfer_orders_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_bank_transfer_orders_updated_at
  BEFORE UPDATE ON bank_transfer_orders
  FOR EACH ROW
  EXECUTE FUNCTION update_bank_transfer_orders_updated_at();

-- コメント
COMMENT ON TABLE bank_transfer_orders IS '銀行振込注文管理テーブル';
COMMENT ON COLUMN bank_transfer_orders.status IS 'pending_confirmation: 振込確認待ち, confirmed: 振込確認済み, shipped: 発送済み, cancelled: キャンセル';
