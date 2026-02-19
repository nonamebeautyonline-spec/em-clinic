-- line_daily_stats: 配信分析ダッシュボード用の日次統計キャッシュ
CREATE TABLE IF NOT EXISTS line_daily_stats (
  id SERIAL PRIMARY KEY,
  tenant_id UUID,
  stat_date DATE NOT NULL,
  followers INTEGER NOT NULL DEFAULT 0,
  targeted_reaches INTEGER NOT NULL DEFAULT 0,
  blocks INTEGER NOT NULL DEFAULT 0,
  messages_sent INTEGER NOT NULL DEFAULT 0,
  total_clicks INTEGER NOT NULL DEFAULT 0,
  unique_clicks INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(tenant_id, stat_date)
);

ALTER TABLE line_daily_stats ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "service_role_only" ON line_daily_stats
    FOR ALL USING (auth.role() = 'service_role');
  EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE INDEX IF NOT EXISTS idx_line_daily_stats_date
  ON line_daily_stats(tenant_id, stat_date DESC);
