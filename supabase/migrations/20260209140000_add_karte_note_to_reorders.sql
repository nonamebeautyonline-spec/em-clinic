-- 再処方カルテを reorders テーブルに持たせる（intake テーブルから移動）
ALTER TABLE reorders ADD COLUMN IF NOT EXISTS karte_note TEXT;
