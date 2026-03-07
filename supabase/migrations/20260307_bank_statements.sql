-- bank_statements: CSV明細行を保存するテーブル
CREATE TABLE IF NOT EXISTS bank_statements (
  id BIGSERIAL PRIMARY KEY,
  tenant_id UUID DEFAULT '00000000-0000-0000-0000-000000000001',
  transaction_date DATE NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  deposit INTEGER DEFAULT 0,
  withdrawal INTEGER DEFAULT 0,
  balance INTEGER,
  month VARCHAR(7) NOT NULL,
  reconciled BOOLEAN DEFAULT FALSE,
  matched_order_id TEXT,
  csv_filename TEXT,
  uploaded_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS有効化 + service_role フルアクセス
ALTER TABLE bank_statements ENABLE ROW LEVEL SECURITY;
CREATE POLICY service_role_full_access ON bank_statements
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- インデックス
CREATE INDEX idx_bank_statements_month ON bank_statements (tenant_id, month);
CREATE INDEX idx_bank_statements_date ON bank_statements (tenant_id, transaction_date DESC);
