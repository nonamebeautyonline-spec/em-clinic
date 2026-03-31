-- Phase 1: イベントバス基盤 + 患者メタデータ + セグメント保存
-- 実行: node scripts/run-sql.js supabase/migrations/20260401_phase1_event_bus_metadata.sql

-- ============================================================
-- 1. イベントログテーブル（イベントバスの監査ログ）
-- ============================================================
CREATE TABLE IF NOT EXISTS event_log (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type VARCHAR(100) NOT NULL,
  patient_id VARCHAR(50),
  line_uid   VARCHAR(100),
  event_data JSONB DEFAULT '{}',
  tenant_id  UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_event_log_tenant_type ON event_log (tenant_id, event_type);
CREATE INDEX IF NOT EXISTS idx_event_log_created ON event_log (created_at);

-- RLS
ALTER TABLE event_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY service_role_full_access_event_log ON event_log
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

-- ============================================================
-- 2. 患者メタデータ JSONB カラム追加
-- ============================================================
-- 既にカラムが存在する場合はスキップ（DO ブロックで安全に実行）
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'patients' AND column_name = 'metadata'
  ) THEN
    ALTER TABLE patients ADD COLUMN metadata JSONB DEFAULT '{}';
  END IF;
END $$;

-- GINインデックス（JSONB検索用）
CREATE INDEX IF NOT EXISTS idx_patients_metadata ON patients USING GIN (metadata);

-- アトミックマージ RPC
-- 既存の metadata と新しいデータをマージする（上書きではなくマージ）
CREATE OR REPLACE FUNCTION merge_patient_metadata(
  p_patient_id TEXT,
  p_data JSONB,
  p_tenant_id UUID
)
RETURNS JSONB
LANGUAGE SQL
SET search_path = 'public'
AS $$
  UPDATE patients
  SET metadata = COALESCE(metadata, '{}'::jsonb) || p_data,
      updated_at = NOW()
  WHERE patient_id = p_patient_id
    AND tenant_id = p_tenant_id
  RETURNING metadata;
$$;

-- ============================================================
-- 3. 保存セグメント（AIクエリの保存・再利用）
-- ============================================================
CREATE TABLE IF NOT EXISTS saved_segments (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name          VARCHAR(200) NOT NULL,
  query_text    TEXT NOT NULL,
  generated_sql TEXT NOT NULL,
  last_count    INTEGER,
  tenant_id     UUID NOT NULL,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_saved_segments_tenant ON saved_segments (tenant_id);

-- RLS
ALTER TABLE saved_segments ENABLE ROW LEVEL SECURITY;
CREATE POLICY service_role_full_access_saved_segments ON saved_segments
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');
