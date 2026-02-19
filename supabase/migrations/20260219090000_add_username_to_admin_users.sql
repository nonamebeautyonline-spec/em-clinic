-- admin_users に username カラム追加（ログインIDとして使用: LP-XXXXX 形式）
-- 既存ユーザーにはバックフィルスクリプトで設定後に NOT NULL 制約を追加する

ALTER TABLE admin_users ADD COLUMN IF NOT EXISTS username TEXT;

-- ユニークインデックス（グローバルに一意）
CREATE UNIQUE INDEX IF NOT EXISTS idx_admin_users_username ON admin_users(username);
