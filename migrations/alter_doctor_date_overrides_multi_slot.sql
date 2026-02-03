-- 複数時間帯対応のためのスキーマ変更
-- 既存の (doctor_id, date) UNIQUE制約を削除し、1日に複数の時間帯を設定可能にする

-- 1. 既存のUNIQUE制約を削除
ALTER TABLE doctor_date_overrides DROP CONSTRAINT IF EXISTS doctor_date_overrides_doctor_id_date_key;

-- 2. slot_nameカラムを追加（時間帯の識別用、例: "午前", "午後", "夜間"）
ALTER TABLE doctor_date_overrides ADD COLUMN IF NOT EXISTS slot_name VARCHAR(50) DEFAULT NULL;

-- 3. 新しいUNIQUE制約を追加（同じ日に同じslot_nameは1つまで）
-- start_timeがある場合はそれも含めてユニークにする
CREATE UNIQUE INDEX IF NOT EXISTS doctor_date_overrides_unique_slot
ON doctor_date_overrides (doctor_id, date, COALESCE(slot_name, 'default'));

-- 4. インデックス追加（検索高速化）
CREATE INDEX IF NOT EXISTS idx_overrides_type ON doctor_date_overrides(type);
