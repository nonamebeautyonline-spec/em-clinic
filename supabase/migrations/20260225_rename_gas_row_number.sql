-- Phase 3: reorders.gas_row_number → reorder_number リネーム
-- GAS（Google Apps Script）時代の命名を正規化
ALTER TABLE reorders RENAME COLUMN gas_row_number TO reorder_number;
