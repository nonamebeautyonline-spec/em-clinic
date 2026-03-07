-- 問診テンプレート複数管理対応
-- UNIQUE(tenant_id) 制約をドロップし、1テナントで複数テンプレートを持てるようにする
-- is_active カラムを追加し、有効なテンプレートを1つだけ指定できるようにする

-- 1. UNIQUE(tenant_id) 制約をドロップ
ALTER TABLE intake_form_definitions DROP CONSTRAINT IF EXISTS intake_form_definitions_tenant_id_key;

-- 2. is_active カラム追加（デフォルト false）
ALTER TABLE intake_form_definitions ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT false;

-- 3. 既存レコードを全てアクティブに設定
UPDATE intake_form_definitions SET is_active = true WHERE is_active = false;
