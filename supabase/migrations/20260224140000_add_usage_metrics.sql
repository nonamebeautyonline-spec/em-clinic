-- 使用量メトリクス拡張
-- 実行日: 2026-02-24

-- 1. monthly_usage にストレージ・API呼出数カラムを追加
ALTER TABLE monthly_usage ADD COLUMN IF NOT EXISTS storage_bytes bigint DEFAULT 0;
ALTER TABLE monthly_usage ADD COLUMN IF NOT EXISTS api_call_count int DEFAULT 0;

-- 2. テナントプランにストレージ上限カラムを追加
ALTER TABLE tenant_plans ADD COLUMN IF NOT EXISTS storage_quota_mb int DEFAULT 1024;
