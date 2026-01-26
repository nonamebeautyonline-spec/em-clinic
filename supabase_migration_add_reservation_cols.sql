-- intakeテーブルに予約情報カラムを追加
-- GASの「問診」シートと同じ構造にする

ALTER TABLE intake ADD COLUMN IF NOT EXISTS reserved_date DATE;
ALTER TABLE intake ADD COLUMN IF NOT EXISTS reserved_time TIME;
ALTER TABLE intake ADD COLUMN IF NOT EXISTS status TEXT;
ALTER TABLE intake ADD COLUMN IF NOT EXISTS note TEXT;
ALTER TABLE intake ADD COLUMN IF NOT EXISTS prescription_menu TEXT;

-- インデックス追加（日付範囲検索の高速化）
CREATE INDEX IF NOT EXISTS idx_intake_reserved_date ON intake(reserved_date);
CREATE INDEX IF NOT EXISTS idx_intake_reserved_date_status ON intake(reserved_date, status);

-- 既存のreservationsテーブルは予約専用として残す
-- intakeテーブルは問診+予約の統合データとして使用
