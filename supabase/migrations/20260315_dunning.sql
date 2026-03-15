-- 未払い自動督促（dunning）ログテーブル
CREATE TABLE dunning_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  patient_id TEXT NOT NULL,
  order_id TEXT NOT NULL,
  dunning_step INTEGER NOT NULL DEFAULT 1,
  sent_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(order_id, dunning_step)
);
ALTER TABLE dunning_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY service_role_full_access ON dunning_logs FOR ALL USING (auth.role() = 'service_role');
