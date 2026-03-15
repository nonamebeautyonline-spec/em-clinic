-- ステップ配信: N分岐対応
-- branches JSONB: [{label: string, condition_rules: ConditionRule[], next_step: number | null}]
-- 最後の要素を「デフォルト分岐」として扱う（condition_rules が空 = どの条件にも該当しない場合）

ALTER TABLE step_items ADD COLUMN IF NOT EXISTS branches JSONB DEFAULT '[]';

-- A/Bテスト用カラム
ALTER TABLE step_items ADD COLUMN IF NOT EXISTS ab_variants JSONB;
ALTER TABLE step_enrollments ADD COLUMN IF NOT EXISTS ab_variant_index INTEGER;
