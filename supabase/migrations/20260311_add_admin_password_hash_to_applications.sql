-- applications テーブルに管理者パスワードハッシュを追加
ALTER TABLE applications ADD COLUMN IF NOT EXISTS admin_password_hash text;
