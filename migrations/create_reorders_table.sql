-- 再処方（reorders）テーブルの作成
-- GASシートからの移行用

CREATE TABLE IF NOT EXISTS reorders (
  id SERIAL PRIMARY KEY,

  -- GASシートと同じカラム
  timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  patient_id VARCHAR(20) NOT NULL,
  product_code VARCHAR(50) NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'pending',
  note TEXT,
  line_uid VARCHAR(100),
  lstep_uid VARCHAR(100),

  -- 追加カラム（DB管理用）
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  approved_at TIMESTAMPTZ,
  rejected_at TIMESTAMPTZ,
  paid_at TIMESTAMPTZ,

  -- GASの行番号（移行・同期用）
  gas_row_number INTEGER
);

-- インデックス
CREATE INDEX IF NOT EXISTS idx_reorders_patient_id ON reorders(patient_id);
CREATE INDEX IF NOT EXISTS idx_reorders_status ON reorders(status);
CREATE INDEX IF NOT EXISTS idx_reorders_timestamp ON reorders(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_reorders_created_at ON reorders(created_at DESC);

-- updated_at を自動更新するトリガー
CREATE OR REPLACE FUNCTION update_reorders_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_reorders_updated_at ON reorders;
CREATE TRIGGER trigger_reorders_updated_at
  BEFORE UPDATE ON reorders
  FOR EACH ROW
  EXECUTE FUNCTION update_reorders_updated_at();

-- コメント
COMMENT ON TABLE reorders IS '再処方申請テーブル（GASシートからの移行）';
COMMENT ON COLUMN reorders.status IS 'pending: 申請中, approved: 承認済み, rejected: 却下, paid: 決済完了, cancelled: キャンセル';
