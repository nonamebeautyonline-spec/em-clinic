-- 支払い滞納→自動サスペンド用カラム追加
-- 実行日: 2026-03-27

-- 支払い失敗日時（猶予期間の起算日）
ALTER TABLE tenant_plans ADD COLUMN IF NOT EXISTS payment_failed_at TIMESTAMPTZ;

-- テナントにサスペンド理由（手動/支払い滞納の区別用）
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS suspended_at TIMESTAMPTZ;
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS suspend_reason TEXT;
