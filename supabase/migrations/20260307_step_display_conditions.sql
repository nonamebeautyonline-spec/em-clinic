-- step_items に表示条件（複合条件分岐）カラムを追加
-- display_conditions: { operator: "and" | "or", conditions: [{ field, op, value }] }
ALTER TABLE step_items ADD COLUMN IF NOT EXISTS display_conditions JSONB;

COMMENT ON COLUMN step_items.display_conditions IS '表示条件（複合条件）: { operator: "and"|"or", conditions: [{ field, op, value }] }';
