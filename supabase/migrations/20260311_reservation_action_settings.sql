-- 予約アクション設定テーブル
-- イベントごとにLINE通知のON/OFF・カスタムメッセージを管理

CREATE TABLE IF NOT EXISTS reservation_action_settings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL,
  event_type TEXT NOT NULL,  -- 'reservation_created', 'reservation_changed', 'reservation_canceled'
  is_enabled BOOLEAN NOT NULL DEFAULT true,
  use_custom_message BOOLEAN NOT NULL DEFAULT false,
  custom_message TEXT,       -- カスタムメッセージ（nullならデフォルトFlex使用）
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(tenant_id, event_type)
);

CREATE INDEX IF NOT EXISTS idx_reservation_action_settings_tenant
  ON reservation_action_settings (tenant_id);

ALTER TABLE reservation_action_settings ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'reservation_action_settings'
      AND policyname = 'service_role_full_access'
  ) THEN
    CREATE POLICY service_role_full_access
      ON reservation_action_settings
      FOR ALL
      USING (auth.role() = 'service_role');
  END IF;
END $$;
