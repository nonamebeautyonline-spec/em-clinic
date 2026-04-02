-- GMO PG 会員管理用カラムを patients テーブルに追加
ALTER TABLE patients ADD COLUMN IF NOT EXISTS gmo_member_id TEXT;
ALTER TABLE patients ADD COLUMN IF NOT EXISTS gmo_card_seq TEXT;

CREATE INDEX IF NOT EXISTS idx_patients_gmo_member_id ON patients(gmo_member_id);

COMMENT ON COLUMN patients.gmo_member_id IS 'GMO PG 会員ID（SaveMember で登録）';
COMMENT ON COLUMN patients.gmo_card_seq IS 'GMO PG カード連番（SaveCard で登録）';
