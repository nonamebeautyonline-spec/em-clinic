-- intakeテーブルにLINEプロフィール情報カラムを追加
ALTER TABLE intake ADD COLUMN IF NOT EXISTS line_display_name VARCHAR(200);
ALTER TABLE intake ADD COLUMN IF NOT EXISTS line_picture_url TEXT;
