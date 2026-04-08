-- 分野別フロー設定カラムを追加
-- intake_frequency: "once"(1回のみ) / "every_time"(毎回)
-- purchase_flow: "reservation_first" / "intake_then_pay" / "intake_reservation_pay"
-- show_in_reorder: 再処方セクションに表示するか

ALTER TABLE medical_fields
ADD COLUMN IF NOT EXISTS flow_config JSONB NOT NULL DEFAULT '{}'::jsonb;

COMMENT ON COLUMN medical_fields.flow_config IS '分野別フロー設定（問診回数・購入フロー・再処方表示）';
