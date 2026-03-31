-- inquiriesテーブルにproductとindustryカラム追加
ALTER TABLE inquiries ADD COLUMN IF NOT EXISTS product TEXT;
ALTER TABLE inquiries ADD COLUMN IF NOT EXISTS industry TEXT;
