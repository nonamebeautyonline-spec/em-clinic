-- 予約変更履歴テーブル
-- UPDATE/DELETEの変更前→変更後を自動記録するトリガー

-- 1. 履歴テーブル作成
CREATE TABLE IF NOT EXISTS reservation_history (
  id SERIAL PRIMARY KEY,
  reservation_id INTEGER NOT NULL,           -- reservationsテーブルのID
  reserve_id VARCHAR(100),                   -- 予約番号
  operation VARCHAR(10) NOT NULL,            -- INSERT, UPDATE, DELETE
  changed_at TIMESTAMPTZ DEFAULT NOW(),      -- 変更日時

  -- 変更前の値（INSERTの場合はNULL）
  old_patient_id VARCHAR(100),
  old_patient_name VARCHAR(200),
  old_reserved_date DATE,
  old_reserved_time TIME,
  old_status VARCHAR(50),
  old_note TEXT,
  old_prescription_menu VARCHAR(100),

  -- 変更後の値（DELETEの場合はNULL）
  new_patient_id VARCHAR(100),
  new_patient_name VARCHAR(200),
  new_reserved_date DATE,
  new_reserved_time TIME,
  new_status VARCHAR(50),
  new_note TEXT,
  new_prescription_menu VARCHAR(100)
);

-- インデックス
CREATE INDEX IF NOT EXISTS idx_history_reservation_id ON reservation_history(reservation_id);
CREATE INDEX IF NOT EXISTS idx_history_reserve_id ON reservation_history(reserve_id);
CREATE INDEX IF NOT EXISTS idx_history_changed_at ON reservation_history(changed_at);

-- 2. トリガー関数作成
CREATE OR REPLACE FUNCTION record_reservation_history()
RETURNS TRIGGER AS $$
BEGIN
  IF (TG_OP = 'INSERT') THEN
    INSERT INTO reservation_history (
      reservation_id, reserve_id, operation,
      new_patient_id, new_patient_name, new_reserved_date, new_reserved_time,
      new_status, new_note, new_prescription_menu
    ) VALUES (
      NEW.id, NEW.reserve_id, 'INSERT',
      NEW.patient_id, NEW.patient_name, NEW.reserved_date, NEW.reserved_time,
      NEW.status, NEW.note, NEW.prescription_menu
    );
    RETURN NEW;

  ELSIF (TG_OP = 'UPDATE') THEN
    -- 変更があった場合のみ記録
    IF (OLD.patient_id IS DISTINCT FROM NEW.patient_id OR
        OLD.patient_name IS DISTINCT FROM NEW.patient_name OR
        OLD.reserved_date IS DISTINCT FROM NEW.reserved_date OR
        OLD.reserved_time IS DISTINCT FROM NEW.reserved_time OR
        OLD.status IS DISTINCT FROM NEW.status OR
        OLD.note IS DISTINCT FROM NEW.note OR
        OLD.prescription_menu IS DISTINCT FROM NEW.prescription_menu) THEN
      INSERT INTO reservation_history (
        reservation_id, reserve_id, operation,
        old_patient_id, old_patient_name, old_reserved_date, old_reserved_time,
        old_status, old_note, old_prescription_menu,
        new_patient_id, new_patient_name, new_reserved_date, new_reserved_time,
        new_status, new_note, new_prescription_menu
      ) VALUES (
        NEW.id, NEW.reserve_id, 'UPDATE',
        OLD.patient_id, OLD.patient_name, OLD.reserved_date, OLD.reserved_time,
        OLD.status, OLD.note, OLD.prescription_menu,
        NEW.patient_id, NEW.patient_name, NEW.reserved_date, NEW.reserved_time,
        NEW.status, NEW.note, NEW.prescription_menu
      );
    END IF;
    RETURN NEW;

  ELSIF (TG_OP = 'DELETE') THEN
    INSERT INTO reservation_history (
      reservation_id, reserve_id, operation,
      old_patient_id, old_patient_name, old_reserved_date, old_reserved_time,
      old_status, old_note, old_prescription_menu
    ) VALUES (
      OLD.id, OLD.reserve_id, 'DELETE',
      OLD.patient_id, OLD.patient_name, OLD.reserved_date, OLD.reserved_time,
      OLD.status, OLD.note, OLD.prescription_menu
    );
    RETURN OLD;
  END IF;

  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- 3. トリガー設定
DROP TRIGGER IF EXISTS reservation_history_trigger ON reservations;

CREATE TRIGGER reservation_history_trigger
AFTER INSERT OR UPDATE OR DELETE ON reservations
FOR EACH ROW EXECUTE FUNCTION record_reservation_history();

-- コメント
COMMENT ON TABLE reservation_history IS '予約の変更履歴。INSERT/UPDATE/DELETEを自動記録';
COMMENT ON COLUMN reservation_history.operation IS '操作種別: INSERT, UPDATE, DELETE';
COMMENT ON COLUMN reservation_history.old_reserved_date IS '変更前の予約日（UPDATE/DELETEで値あり）';
COMMENT ON COLUMN reservation_history.new_reserved_date IS '変更後の予約日（INSERT/UPDATEで値あり）';
