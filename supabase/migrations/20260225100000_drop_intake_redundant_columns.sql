-- Phase 2-4: intake テーブルから冗長カラムを削除
-- これらのデータは正規化先テーブルに確実に存在（Phase 2-0/2-1 で検証・修復済み）
--   patient_name → patients.name
--   line_id → patients.line_id
--   reserved_date → reservations.reserved_date
--   reserved_time → reservations.reserved_time
--   prescription_menu → reservations.prescription_menu
-- ※ reserve_id は残す（intake と reservations の紐付けキー）
-- ※ answerer_id は残す（Lステップ UID として使用中）

ALTER TABLE intake DROP COLUMN IF EXISTS patient_name;
ALTER TABLE intake DROP COLUMN IF EXISTS line_id;
ALTER TABLE intake DROP COLUMN IF EXISTS reserved_date;
ALTER TABLE intake DROP COLUMN IF EXISTS reserved_time;
ALTER TABLE intake DROP COLUMN IF EXISTS prescription_menu;
