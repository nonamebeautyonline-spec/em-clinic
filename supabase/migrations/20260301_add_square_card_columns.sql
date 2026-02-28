-- patients テーブルに Square Customer/Card ID を追加（アプリ内決済用）
-- ※ Supabaseダッシュボードで手動実行が必要

ALTER TABLE patients ADD COLUMN IF NOT EXISTS square_customer_id TEXT;
ALTER TABLE patients ADD COLUMN IF NOT EXISTS square_card_id TEXT;

-- インデックス（customer_id による検索用）
CREATE INDEX IF NOT EXISTS idx_patients_square_customer_id ON patients(square_customer_id);

COMMENT ON COLUMN patients.square_customer_id IS 'Square Customer ID（カード保存用）';
COMMENT ON COLUMN patients.square_card_id IS 'Square Card on File ID（保存済みカード決済用）';
