-- inventory_logs に入荷数カラムを追加
ALTER TABLE inventory_logs
ADD COLUMN IF NOT EXISTS received_count INT NOT NULL DEFAULT 0;
