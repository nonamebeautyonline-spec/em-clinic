-- friend_summaries にカテゴリ5（outgoing）を追加
-- outgoing メッセージのみの患者がトーク一覧最下部に沈む問題を修正

-- =============================================
-- Step 1: カラム追加
-- =============================================

ALTER TABLE friend_summaries
  ADD COLUMN IF NOT EXISTS last_outgoing_content TEXT,
  ADD COLUMN IF NOT EXISTS last_outgoing_at TIMESTAMPTZ;

-- =============================================
-- Step 2: トリガー関数を更新（カテゴリ5追加）
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
      last_event_content, last_event_at, last_event_type,
      last_outgoing_content, last_outgoing_at)
    VALUES (
      NEW.patient_id,
      NEW.tenant_id,
      -- カテゴリ1 incoming_any: direction != 'outgoing'
      CASE WHEN NEW.direction IS DISTINCT FROM 'outgoing' THEN NEW.sent_at END,
      -- カテゴリ2 incoming_msg: direction = 'incoming' AND message_type != 'event'
      CASE WHEN NEW.direction = 'incoming' AND NEW.message_type != 'event' THEN NEW.content END,
      CASE WHEN NEW.direction = 'incoming' AND NEW.message_type != 'event' THEN NEW.sent_at END,
      -- カテゴリ3 template: direction = 'outgoing' AND content LIKE '【%'
      CASE WHEN NEW.direction = 'outgoing' AND NEW.content LIKE '【%' THEN NEW.content END,
      CASE WHEN NEW.direction = 'outgoing' AND NEW.content LIKE '【%' THEN NEW.sent_at END,
      -- カテゴリ4 event: direction = 'incoming' AND message_type = 'event' AND event_type != 'system'
      CASE WHEN NEW.direction = 'incoming' AND NEW.message_type = 'event'
           AND (NEW.event_type IS NULL OR NEW.event_type != 'system') THEN NEW.content END,
      CASE WHEN NEW.direction = 'incoming' AND NEW.message_type = 'event'
           AND (NEW.event_type IS NULL OR NEW.event_type != 'system') THEN NEW.sent_at END,
      CASE WHEN NEW.direction = 'incoming' AND NEW.message_type = 'event'
           AND (NEW.event_type IS NULL OR NEW.event_type != 'system') THEN NEW.event_type END,
      -- カテゴリ5 outgoing: direction = 'outgoing'
      CASE WHEN NEW.direction = 'outgoing' THEN NEW.content END,
      CASE WHEN NEW.direction = 'outgoing' THEN NEW.sent_at END
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
        THEN NEW.event_type ELSE friend_summaries.last_event_type END,

      -- カテゴリ5: outgoing（新しい場合のみ更新）
      last_outgoing_content = CASE
        WHEN NEW.direction = 'outgoing'
             AND (friend_summaries.last_outgoing_at IS NULL OR NEW.sent_at > friend_summaries.last_outgoing_at)
        THEN NEW.content ELSE friend_summaries.last_outgoing_content END,
      last_outgoing_at = CASE
        WHEN NEW.direction = 'outgoing'
             AND (friend_summaries.last_outgoing_at IS NULL OR NEW.sent_at > friend_summaries.last_outgoing_at)
        THEN NEW.sent_at ELSE friend_summaries.last_outgoing_at END;

  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING '[friend_summaries] update failed for patient %: %', NEW.patient_id, SQLERRM;
  END;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- =============================================
-- Step 3: RPC更新（outgoing フィールド追加）
-- =============================================

CREATE OR REPLACE FUNCTION get_friends_list(p_tenant_id uuid DEFAULT NULL)
RETURNS TABLE(
  patient_id text,
  patient_name text,
  line_id text,
  line_display_name text,
  line_picture_url text,
  mark text,
  last_msg_content text,
  last_msg_at timestamptz,
  last_incoming_at timestamptz,
  last_template_content text,
  last_event_content text,
  last_event_type text,
  last_outgoing_content text,
  last_outgoing_at timestamptz
) AS $$
  SELECT
    fs.patient_id,
    COALESCE(p.name, '') AS patient_name,
    p.line_id,
    p.line_display_name,
    p.line_picture_url,
    COALESCE(pm.mark, 'none') AS mark,
    fs.last_msg_content,
    fs.last_msg_at,
    fs.last_incoming_at,
    fs.last_template_content,
    fs.last_event_content,
    fs.last_event_type,
    fs.last_outgoing_content,
    fs.last_outgoing_at
  FROM friend_summaries fs
  JOIN patients p ON p.patient_id = fs.patient_id
  LEFT JOIN patient_marks pm ON pm.patient_id = fs.patient_id
  WHERE (p_tenant_id IS NULL OR fs.tenant_id = p_tenant_id)
$$ LANGUAGE SQL STABLE;

-- =============================================
-- Step 4: 既存データのバックフィル（カテゴリ5）
-- =============================================

INSERT INTO friend_summaries (patient_id, tenant_id, last_outgoing_content, last_outgoing_at)
SELECT DISTINCT ON (patient_id) patient_id, tenant_id, content, sent_at
FROM message_log
WHERE direction = 'outgoing' AND patient_id IS NOT NULL
ORDER BY patient_id, sent_at DESC
ON CONFLICT (patient_id) DO UPDATE SET
  last_outgoing_content = EXCLUDED.last_outgoing_content,
  last_outgoing_at = EXCLUDED.last_outgoing_at,
  tenant_id = COALESCE(EXCLUDED.tenant_id, friend_summaries.tenant_id);
