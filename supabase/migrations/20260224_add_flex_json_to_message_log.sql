-- message_log に flex_json カラムを追加（Flex Message の中身をそのまま保存）
ALTER TABLE message_log ADD COLUMN IF NOT EXISTS flex_json JSONB;

-- message_type が VARCHAR(20) だと reservation_canceled 等が溢れるので拡張
ALTER TABLE message_log ALTER COLUMN message_type TYPE VARCHAR(50);
