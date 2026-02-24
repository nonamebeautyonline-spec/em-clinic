-- 電子カルテシステム連携用テーブル

-- 外部カルテ患者IDマッピング
CREATE TABLE IF NOT EXISTS ehr_patient_mappings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID,
  patient_id TEXT NOT NULL,
  provider TEXT NOT NULL,             -- "orca" | "csv" | "fhir"
  external_id TEXT NOT NULL,
  last_synced_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(tenant_id, provider, external_id)
);

-- 同期ログ
CREATE TABLE IF NOT EXISTS ehr_sync_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID,
  provider TEXT NOT NULL,
  direction TEXT NOT NULL,            -- "pull" | "push"
  resource_type TEXT NOT NULL,        -- "patient" | "karte"
  patient_id TEXT,
  external_id TEXT,
  status TEXT NOT NULL,               -- "success" | "error" | "skipped"
  detail TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ehr_sync_logs_tenant ON ehr_sync_logs(tenant_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ehr_mappings_patient ON ehr_patient_mappings(tenant_id, patient_id);
CREATE INDEX IF NOT EXISTS idx_ehr_mappings_lookup ON ehr_patient_mappings(tenant_id, provider, patient_id);

-- RLS
ALTER TABLE ehr_patient_mappings ENABLE ROW LEVEL SECURITY;
ALTER TABLE ehr_sync_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "ehr_patient_mappings_service" ON ehr_patient_mappings
  FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "ehr_sync_logs_service" ON ehr_sync_logs
  FOR ALL USING (true) WITH CHECK (true);
