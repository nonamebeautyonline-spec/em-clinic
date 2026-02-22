-- undo_history: 操作の取り消し履歴テーブル
CREATE TABLE IF NOT EXISTS undo_history (
  id SERIAL PRIMARY KEY,
  tenant_id TEXT,
  action_type TEXT NOT NULL,           -- 'update', 'delete', 'insert'
  resource_type TEXT NOT NULL,         -- 'intake', 'reorder', 'patient', 'reservation'
  resource_id TEXT NOT NULL,           -- 対象レコードのID
  previous_data JSONB NOT NULL,        -- 変更前のデータ
  current_data JSONB,                  -- 変更後のデータ（参考用）
  admin_user_id TEXT,                  -- 操作した管理者
  description TEXT,                    -- 操作の説明（例: "カルテ編集"）
  undone BOOLEAN DEFAULT FALSE,        -- 取り消し済みフラグ
  expires_at TIMESTAMPTZ NOT NULL,     -- 有効期限（作成から24時間）
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- テナントID + 有効期限でのクエリ最適化
CREATE INDEX IF NOT EXISTS idx_undo_history_tenant_expires
  ON undo_history (tenant_id, expires_at DESC)
  WHERE undone = FALSE;

-- 期限切れレコード自動削除用（将来のcronジョブ向け）
CREATE INDEX IF NOT EXISTS idx_undo_history_expires
  ON undo_history (expires_at)
  WHERE undone = FALSE;
