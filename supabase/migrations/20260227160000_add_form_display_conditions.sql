-- フォームフィールドに表示条件（条件分岐）を追加
--
-- forms.fields JSONB 内の各フィールドオブジェクトに display_conditions プロパティを追加可能にする。
-- JSONB は柔軟なスキーマのため、カラム追加は不要。
-- このファイルは display_conditions の JSON 構造をドキュメントとして記録するもの。
--
-- display_conditions の構造:
--   単一条件: { "when": "field_id", "operator": "equals|not_equals|contains|not_empty|is_empty", "value": "比較値" }
--   複数条件: { "logic": "and|or", "conditions": [単一条件, ...] }
--   null/未設定: 常に表示
--
-- 例:
--   { "when": "q1", "operator": "equals", "value": "はい" }
--   → q1 が「はい」のときのみ表示
--
--   { "logic": "and", "conditions": [
--       { "when": "q1", "operator": "equals", "value": "はい" },
--       { "when": "q2", "operator": "not_empty" }
--   ]}
--   → q1 が「はい」かつ q2 が空でないときのみ表示

-- GIN インデックスで display_conditions を含むフィールド検索を高速化
-- （既に fields に GIN インデックスがある場合はスキップ）
CREATE INDEX IF NOT EXISTS idx_forms_fields_gin ON forms USING gin (fields);

-- display_conditions を持つフォームを検索する補助コメント
COMMENT ON COLUMN forms.fields IS 'フォームフィールド定義（JSONB配列）。各フィールドに display_conditions プロパティで条件分岐を設定可能';
