-- パスワード履歴テーブル
CREATE TABLE IF NOT EXISTS password_history (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  admin_user_id uuid NOT NULL REFERENCES admin_users(id) ON DELETE CASCADE,
  password_hash text NOT NULL,
  created_at timestamptz DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_password_history_user ON password_history(admin_user_id, created_at DESC);

-- パスワード変更日時カラム（既存ユーザーはnull=期限チェックスキップ）
ALTER TABLE admin_users ADD COLUMN IF NOT EXISTS password_changed_at timestamptz;
