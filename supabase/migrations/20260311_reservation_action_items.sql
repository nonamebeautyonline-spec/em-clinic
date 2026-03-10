-- 予約アクション設定の拡張: 複数アクション積み重ね対応
-- 1. reservation_action_settings に repeat_on_subsequent 追加
-- 2. reservation_action_items テーブル新設（1イベント = 複数アクション）

-- ============================================
-- 1. reservation_action_settings 拡張
-- ============================================
ALTER TABLE reservation_action_settings
  ADD COLUMN IF NOT EXISTS repeat_on_subsequent BOOLEAN NOT NULL DEFAULT true;

-- 旧カラムは残すが新UIでは使わない（後方互換）
-- use_custom_message, custom_message は今後非推奨

-- ============================================
-- 2. reservation_action_items（アクション個別アイテム）
-- ============================================
CREATE TABLE IF NOT EXISTS reservation_action_items (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  action_setting_id UUID NOT NULL REFERENCES reservation_action_settings(id) ON DELETE CASCADE,
  sort_order INTEGER NOT NULL DEFAULT 0,
  action_type TEXT NOT NULL,
  -- action_type 別の設定をJSON格納:
  --   text_send:      { "message": "..." }
  --   template_send:  { "template_id": "uuid" }
  --   tag_add:        { "tag_id": 123 }
  --   tag_remove:     { "tag_id": 123 }
  --   mark_change:    { "mark": "green" }
  --   menu_change:    { "rich_menu_id": 1 }
  config JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_reservation_action_items_setting
  ON reservation_action_items (action_setting_id, sort_order);

ALTER TABLE reservation_action_items ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'reservation_action_items'
      AND policyname = 'service_role_full_access'
  ) THEN
    CREATE POLICY service_role_full_access
      ON reservation_action_items
      FOR ALL
      USING (auth.role() = 'service_role');
  END IF;
END $$;
