-- admin_users に TOTP 2要素認証カラムを追加
-- 実行日: 2026-03-27

-- TOTPシークレット（暗号化済みBase32文字列）
ALTER TABLE admin_users ADD COLUMN IF NOT EXISTS totp_secret TEXT;

-- TOTP有効フラグ
ALTER TABLE admin_users ADD COLUMN IF NOT EXISTS totp_enabled BOOLEAN DEFAULT false;

-- バックアップコード（JSON配列、使用済みコードは削除される）
ALTER TABLE admin_users ADD COLUMN IF NOT EXISTS totp_backup_codes JSONB;
