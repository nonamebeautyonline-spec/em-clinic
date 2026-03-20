-- reminder_sent_log に reserved_date を追加
-- 予約日変更後にリマインドが再送信されるようにする
-- (rule_id, reservation_id) → (rule_id, reservation_id, reserved_date) に変更

-- 1. カラム追加
ALTER TABLE reminder_sent_log
  ADD COLUMN reserved_date date;

-- 2. 既存レコードに reserved_date をバックフィル（reservations から取得）
UPDATE reminder_sent_log rsl
SET reserved_date = r.reserved_date
FROM reservations r
WHERE rsl.reservation_id = r.id;

-- 3. NOT NULL 制約を追加
ALTER TABLE reminder_sent_log
  ALTER COLUMN reserved_date SET NOT NULL;

-- 4. 旧ユニーク制約を削除
ALTER TABLE reminder_sent_log
  DROP CONSTRAINT reminder_sent_log_rule_id_reservation_id_key;

-- 5. 新ユニーク制約を追加（reserved_date を含む）
ALTER TABLE reminder_sent_log
  ADD CONSTRAINT reminder_sent_log_rule_reservation_date_key
  UNIQUE (rule_id, reservation_id, reserved_date);
