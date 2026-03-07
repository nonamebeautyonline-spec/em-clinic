-- 共有テンプレートテーブル（テナント間テンプレート共有機能）
CREATE TABLE IF NOT EXISTS shared_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  category TEXT,
  content JSONB NOT NULL DEFAULT '{}'::jsonb,
  template_type TEXT NOT NULL DEFAULT 'message' CHECK (template_type IN ('message', 'flex', 'workflow')),
  tags TEXT[] DEFAULT '{}',
  created_by UUID,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- RLS有効化
ALTER TABLE shared_templates ENABLE ROW LEVEL SECURITY;

-- service_role用フルアクセスポリシー
CREATE POLICY service_role_full_access ON shared_templates
  FOR ALL
  TO service_role
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

-- updated_at自動更新トリガー
CREATE OR REPLACE FUNCTION update_shared_templates_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = 'public';

CREATE TRIGGER trg_shared_templates_updated_at
  BEFORE UPDATE ON shared_templates
  FOR EACH ROW
  EXECUTE FUNCTION update_shared_templates_updated_at();

COMMENT ON TABLE shared_templates IS 'プラットフォーム管理者が作成・管理する共有テンプレート。テナントがインポートして利用可能。';
