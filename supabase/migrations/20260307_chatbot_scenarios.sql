-- シナリオ型チャットボットテーブル
-- chatbot_scenarios: シナリオ定義
-- chatbot_nodes: シナリオ内のノード（メッセージ/質問/アクション/条件分岐）
-- chatbot_sessions: ユーザーごとのセッション状態

-- ========== chatbot_scenarios ==========
CREATE TABLE IF NOT EXISTS chatbot_scenarios (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL DEFAULT '00000000-0000-0000-0000-000000000001',
  name TEXT NOT NULL,
  description TEXT,
  trigger_keyword TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE chatbot_scenarios ENABLE ROW LEVEL SECURITY;

CREATE POLICY service_role_full_access ON chatbot_scenarios
  FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

-- ========== chatbot_nodes ==========
CREATE TABLE IF NOT EXISTS chatbot_nodes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  scenario_id UUID NOT NULL REFERENCES chatbot_scenarios(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL DEFAULT '00000000-0000-0000-0000-000000000001',
  node_type TEXT NOT NULL CHECK (node_type IN ('message', 'question', 'action', 'condition')),
  position_x DOUBLE PRECISION NOT NULL DEFAULT 0,
  position_y DOUBLE PRECISION NOT NULL DEFAULT 0,
  data JSONB NOT NULL DEFAULT '{}',
  next_node_id UUID REFERENCES chatbot_nodes(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE chatbot_nodes ENABLE ROW LEVEL SECURITY;

CREATE POLICY service_role_full_access ON chatbot_nodes
  FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

-- ========== chatbot_sessions ==========
CREATE TABLE IF NOT EXISTS chatbot_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL DEFAULT '00000000-0000-0000-0000-000000000001',
  patient_id TEXT NOT NULL,
  scenario_id UUID NOT NULL REFERENCES chatbot_scenarios(id) ON DELETE CASCADE,
  current_node_id UUID REFERENCES chatbot_nodes(id) ON DELETE SET NULL,
  context JSONB NOT NULL DEFAULT '{}',
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ
);

ALTER TABLE chatbot_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY service_role_full_access ON chatbot_sessions
  FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

-- インデックス
CREATE INDEX IF NOT EXISTS idx_chatbot_scenarios_tenant ON chatbot_scenarios(tenant_id);
CREATE INDEX IF NOT EXISTS idx_chatbot_scenarios_trigger ON chatbot_scenarios(trigger_keyword) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_chatbot_nodes_scenario ON chatbot_nodes(scenario_id);
CREATE INDEX IF NOT EXISTS idx_chatbot_sessions_patient ON chatbot_sessions(patient_id, completed_at);
CREATE INDEX IF NOT EXISTS idx_chatbot_sessions_scenario ON chatbot_sessions(scenario_id);
