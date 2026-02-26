-- 友だちリスト高速化: 事前集計テーブル + DBトリガー
-- message_log の毎回フルスキャン（4回×17,000行+）を廃止し、
-- メッセージINSERT時にトリガーでサマリーを自動更新する方式に変更

-- =============================================
-- Step 1: friend_summaries テーブル作成
-- =============================================

CREATE TABLE IF NOT EXISTS friend_summaries (
  patient_id VARCHAR(20) PRIMARY KEY,
  tenant_id UUID,

  -- カテゴリ1: 最新の受信時刻（ソート用: direction != 'outgoing'）
  last_incoming_at TIMESTAMPTZ,

  -- カテゴリ2: 最新の顧客メッセージ（左カラム表示用: incoming かつ event以外）
  last_msg_content TEXT,
  last_msg_at TIMESTAMPTZ,

  -- カテゴリ3: 最新のテンプレート送信（outgoing かつ【】形式）
  last_template_content TEXT,
  last_template_at TIMESTAMPTZ,

  -- カテゴリ4: 最新のフォロー/ブロックイベント
  last_event_content TEXT,
  last_event_at TIMESTAMPTZ,
  last_event_type TEXT
);

CREATE INDEX IF NOT EXISTS idx_friend_summaries_tenant ON friend_summaries(tenant_id);

ALTER TABLE friend_summaries ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  CREATE POLICY "service_role_only" ON friend_summaries
    FOR ALL USING (auth.role() = 'service_role');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- =============================================
-- Step 2: トリガー関数 + トリガー作成
-- =============================================

CREATE OR REPLACE FUNCTION update_friend_summary()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.patient_id IS NULL THEN
    RETURN NEW;
  END IF;

  -- トリガー失敗時も message_log INSERT を妨げない（graceful degradation）
  BEGIN
    INSERT INTO friend_summaries (patient_id, tenant_id,
      last_incoming_at, last_msg_content, last_msg_at,
      last_template_content, last_template_at,
      last_event_content, last_event_at, last_event_type)
    VALUES (
      NEW.patient_id,
      NEW.tenant_id,
      -- incoming_any: direction != 'outgoing'
      CASE WHEN NEW.direction IS DISTINCT FROM 'outgoing' THEN NEW.sent_at END,
      -- incoming_msg: direction = 'incoming' AND message_type != 'event'
      CASE WHEN NEW.direction = 'incoming' AND NEW.message_type != 'event' THEN NEW.content END,
      CASE WHEN NEW.direction = 'incoming' AND NEW.message_type != 'event' THEN NEW.sent_at END,
      -- template: direction = 'outgoing' AND content LIKE '【%'
      CASE WHEN NEW.direction = 'outgoing' AND NEW.content LIKE '【%' THEN NEW.content END,
      CASE WHEN NEW.direction = 'outgoing' AND NEW.content LIKE '【%' THEN NEW.sent_at END,
      -- event: direction = 'incoming' AND message_type = 'event' AND event_type != 'system'
      CASE WHEN NEW.direction = 'incoming' AND NEW.message_type = 'event'
           AND (NEW.event_type IS NULL OR NEW.event_type != 'system') THEN NEW.content END,
      CASE WHEN NEW.direction = 'incoming' AND NEW.message_type = 'event'
           AND (NEW.event_type IS NULL OR NEW.event_type != 'system') THEN NEW.sent_at END,
      CASE WHEN NEW.direction = 'incoming' AND NEW.message_type = 'event'
           AND (NEW.event_type IS NULL OR NEW.event_type != 'system') THEN NEW.event_type END
    )
    ON CONFLICT (patient_id) DO UPDATE SET
      tenant_id = COALESCE(EXCLUDED.tenant_id, friend_summaries.tenant_id),

      -- カテゴリ1: incoming_any（新しい場合のみ更新）
      last_incoming_at = CASE
        WHEN NEW.direction IS DISTINCT FROM 'outgoing'
             AND (friend_summaries.last_incoming_at IS NULL OR NEW.sent_at > friend_summaries.last_incoming_at)
        THEN NEW.sent_at ELSE friend_summaries.last_incoming_at END,

      -- カテゴリ2: incoming_msg（新しい場合のみ更新）
      last_msg_content = CASE
        WHEN NEW.direction = 'incoming' AND NEW.message_type != 'event'
             AND (friend_summaries.last_msg_at IS NULL OR NEW.sent_at > friend_summaries.last_msg_at)
        THEN NEW.content ELSE friend_summaries.last_msg_content END,
      last_msg_at = CASE
        WHEN NEW.direction = 'incoming' AND NEW.message_type != 'event'
             AND (friend_summaries.last_msg_at IS NULL OR NEW.sent_at > friend_summaries.last_msg_at)
        THEN NEW.sent_at ELSE friend_summaries.last_msg_at END,

      -- カテゴリ3: template（新しい場合のみ更新）
      last_template_content = CASE
        WHEN NEW.direction = 'outgoing' AND NEW.content LIKE '【%'
             AND (friend_summaries.last_template_at IS NULL OR NEW.sent_at > friend_summaries.last_template_at)
        THEN NEW.content ELSE friend_summaries.last_template_content END,
      last_template_at = CASE
        WHEN NEW.direction = 'outgoing' AND NEW.content LIKE '【%'
             AND (friend_summaries.last_template_at IS NULL OR NEW.sent_at > friend_summaries.last_template_at)
        THEN NEW.sent_at ELSE friend_summaries.last_template_at END,

      -- カテゴリ4: event（新しい場合のみ更新）
      last_event_content = CASE
        WHEN NEW.direction = 'incoming' AND NEW.message_type = 'event'
             AND (NEW.event_type IS NULL OR NEW.event_type != 'system')
             AND (friend_summaries.last_event_at IS NULL OR NEW.sent_at > friend_summaries.last_event_at)
        THEN NEW.content ELSE friend_summaries.last_event_content END,
      last_event_at = CASE
        WHEN NEW.direction = 'incoming' AND NEW.message_type = 'event'
             AND (NEW.event_type IS NULL OR NEW.event_type != 'system')
             AND (friend_summaries.last_event_at IS NULL OR NEW.sent_at > friend_summaries.last_event_at)
        THEN NEW.sent_at ELSE friend_summaries.last_event_at END,
      last_event_type = CASE
        WHEN NEW.direction = 'incoming' AND NEW.message_type = 'event'
             AND (NEW.event_type IS NULL OR NEW.event_type != 'system')
             AND (friend_summaries.last_event_at IS NULL OR NEW.sent_at > friend_summaries.last_event_at)
        THEN NEW.event_type ELSE friend_summaries.last_event_type END;

  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING '[friend_summaries] update failed for patient %: %', NEW.patient_id, SQLERRM;
  END;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_update_friend_summary
  AFTER INSERT ON message_log
  FOR EACH ROW
  EXECUTE FUNCTION update_friend_summary();

-- =============================================
-- Step 3: 既存データの初期化
-- =============================================

-- カテゴリ1: incoming_any（最新受信時刻）
INSERT INTO friend_summaries (patient_id, tenant_id, last_incoming_at)
SELECT DISTINCT ON (patient_id) patient_id, tenant_id, sent_at
FROM message_log
WHERE direction IS DISTINCT FROM 'outgoing' AND patient_id IS NOT NULL
ORDER BY patient_id, sent_at DESC
ON CONFLICT (patient_id) DO UPDATE SET
  last_incoming_at = EXCLUDED.last_incoming_at,
  tenant_id = COALESCE(EXCLUDED.tenant_id, friend_summaries.tenant_id);

-- カテゴリ2: incoming_msg（最新顧客メッセージ）
INSERT INTO friend_summaries (patient_id, tenant_id, last_msg_content, last_msg_at)
SELECT DISTINCT ON (patient_id) patient_id, tenant_id, content, sent_at
FROM message_log
WHERE direction = 'incoming' AND message_type != 'event' AND patient_id IS NOT NULL
ORDER BY patient_id, sent_at DESC
ON CONFLICT (patient_id) DO UPDATE SET
  last_msg_content = EXCLUDED.last_msg_content,
  last_msg_at = EXCLUDED.last_msg_at,
  tenant_id = COALESCE(EXCLUDED.tenant_id, friend_summaries.tenant_id);

-- カテゴリ3: template（最新テンプレート送信）
INSERT INTO friend_summaries (patient_id, tenant_id, last_template_content, last_template_at)
SELECT DISTINCT ON (patient_id) patient_id, tenant_id, content, sent_at
FROM message_log
WHERE direction = 'outgoing' AND content LIKE '【%' AND patient_id IS NOT NULL
ORDER BY patient_id, sent_at DESC
ON CONFLICT (patient_id) DO UPDATE SET
  last_template_content = EXCLUDED.last_template_content,
  last_template_at = EXCLUDED.last_template_at,
  tenant_id = COALESCE(EXCLUDED.tenant_id, friend_summaries.tenant_id);

-- カテゴリ4: event（最新フォロー/ブロック）
INSERT INTO friend_summaries (patient_id, tenant_id, last_event_content, last_event_at, last_event_type)
SELECT DISTINCT ON (patient_id) patient_id, tenant_id, content, sent_at, event_type
FROM message_log
WHERE direction = 'incoming' AND message_type = 'event'
  AND (event_type IS NULL OR event_type != 'system')
  AND patient_id IS NOT NULL
ORDER BY patient_id, sent_at DESC
ON CONFLICT (patient_id) DO UPDATE SET
  last_event_content = EXCLUDED.last_event_content,
  last_event_at = EXCLUDED.last_event_at,
  last_event_type = EXCLUDED.last_event_type,
  tenant_id = COALESCE(EXCLUDED.tenant_id, friend_summaries.tenant_id);
