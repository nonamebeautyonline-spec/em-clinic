-- エクスポートジョブテーブル
CREATE TABLE IF NOT EXISTS export_jobs (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id uuid,
  admin_user_id uuid,
  status text DEFAULT 'pending',
  file_url text,
  error_message text,
  tables_included text[],
  record_counts jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now(),
  completed_at timestamptz
);
CREATE INDEX IF NOT EXISTS idx_export_jobs_tenant ON export_jobs(tenant_id, created_at DESC);
