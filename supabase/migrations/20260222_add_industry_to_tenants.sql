-- tenants テーブルに業種カラムを追加
-- 将来的にクリニック以外（サロン・小売等）にも対応するための基盤
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS industry TEXT DEFAULT 'clinic';

-- 業種で絞り込むクエリ用インデックス
CREATE INDEX IF NOT EXISTS idx_tenants_industry ON tenants(industry);

-- 既存テナントはすべて 'clinic' に設定
UPDATE tenants SET industry = 'clinic' WHERE industry IS NULL;
