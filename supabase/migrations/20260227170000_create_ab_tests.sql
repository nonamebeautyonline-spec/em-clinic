-- ABテスト管理テーブル
CREATE TABLE IF NOT EXISTS ab_tests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  name TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'draft', -- draft/running/completed/cancelled
  target_segment TEXT, -- 対象セグメント（null=全員）
  target_count INTEGER NOT NULL DEFAULT 0, -- 対象人数
  winner_variant_id UUID, -- 勝者バリアント
  winner_criteria TEXT NOT NULL DEFAULT 'open_rate', -- open_rate/click_rate/conversion_rate
  auto_select_winner BOOLEAN NOT NULL DEFAULT true,
  min_sample_size INTEGER NOT NULL DEFAULT 100, -- 最低サンプルサイズ
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ABテストバリアント
CREATE TABLE IF NOT EXISTS ab_test_variants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ab_test_id UUID NOT NULL REFERENCES ab_tests(id) ON DELETE CASCADE,
  name TEXT NOT NULL, -- 'A', 'B' など
  template_id UUID REFERENCES message_templates(id),
  message_content TEXT, -- テンプレートなしの場合の直接入力
  message_type TEXT NOT NULL DEFAULT 'text',
  allocation_ratio NUMERIC NOT NULL DEFAULT 50, -- 配分比率（%）
  sent_count INTEGER NOT NULL DEFAULT 0,
  open_count INTEGER NOT NULL DEFAULT 0,
  click_count INTEGER NOT NULL DEFAULT 0,
  conversion_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- RLSポリシー（service_role_onlyパターン）
ALTER TABLE ab_tests ENABLE ROW LEVEL SECURITY;
ALTER TABLE ab_test_variants ENABLE ROW LEVEL SECURITY;
CREATE POLICY "service_role_only" ON ab_tests FOR ALL TO service_role USING (true);
CREATE POLICY "service_role_only" ON ab_test_variants FOR ALL TO service_role USING (true);

-- インデックス
CREATE INDEX IF NOT EXISTS idx_ab_tests_tenant_id ON ab_tests(tenant_id);
CREATE INDEX IF NOT EXISTS idx_ab_tests_status ON ab_tests(status);
CREATE INDEX IF NOT EXISTS idx_ab_test_variants_ab_test_id ON ab_test_variants(ab_test_id);
