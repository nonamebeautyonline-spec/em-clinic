-- step_items に条件分岐カラムを追加
ALTER TABLE step_items ADD COLUMN IF NOT EXISTS condition_rules JSONB DEFAULT '[]';
ALTER TABLE step_items ADD COLUMN IF NOT EXISTS branch_true_step INTEGER;
ALTER TABLE step_items ADD COLUMN IF NOT EXISTS branch_false_step INTEGER;
ALTER TABLE step_items ADD COLUMN IF NOT EXISTS exit_condition_rules JSONB DEFAULT '[]';
ALTER TABLE step_items ADD COLUMN IF NOT EXISTS exit_action VARCHAR(20) DEFAULT 'exit';
ALTER TABLE step_items ADD COLUMN IF NOT EXISTS exit_jump_to INTEGER;
