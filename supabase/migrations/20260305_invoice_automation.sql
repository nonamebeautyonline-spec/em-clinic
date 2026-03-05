-- 請求自動化: monthly_usage に請求書生成フラグを追加
-- 実行日: 2026-03-05

ALTER TABLE monthly_usage ADD COLUMN IF NOT EXISTS invoice_generated BOOLEAN DEFAULT false;
