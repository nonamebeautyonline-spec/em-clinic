-- Google Calendar 双方向同期用テーブル
-- テナントごとにincremental sync tokenとpush通知チャンネル情報を管理

CREATE TABLE IF NOT EXISTS google_calendar_sync_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  calendar_id TEXT NOT NULL DEFAULT 'primary',
  sync_token TEXT,
  channel_id TEXT,
  channel_expiration TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- テナント+カレンダーIDでユニーク制約
CREATE UNIQUE INDEX IF NOT EXISTS idx_gcal_sync_tokens_tenant_calendar
  ON google_calendar_sync_tokens(tenant_id, calendar_id);

-- RLS有効化
ALTER TABLE google_calendar_sync_tokens ENABLE ROW LEVEL SECURITY;

-- service_role用フルアクセスポリシー
CREATE POLICY service_role_full_access ON google_calendar_sync_tokens
  FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

-- reservationsテーブルにgcal_event_idカラムを追加（同期用）
ALTER TABLE reservations ADD COLUMN IF NOT EXISTS gcal_event_id TEXT;
COMMENT ON COLUMN reservations.gcal_event_id IS 'Google CalendarイベントID（双方向同期用）';
