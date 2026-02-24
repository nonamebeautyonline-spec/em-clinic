-- インシデント管理テーブル
CREATE TABLE IF NOT EXISTS incidents (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  title text NOT NULL,
  description text,
  severity text DEFAULT 'minor',
  status text DEFAULT 'investigating',
  started_at timestamptz DEFAULT now(),
  resolved_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- 最新インシデント取得用インデックス
CREATE INDEX IF NOT EXISTS idx_incidents_started_at ON incidents(started_at DESC);
CREATE INDEX IF NOT EXISTS idx_incidents_status ON incidents(status);
