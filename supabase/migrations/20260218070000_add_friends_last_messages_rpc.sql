-- 友だち一覧用: 患者ごとの最新メッセージをカテゴリ別に取得するRPC関数
-- message_log 全件取得（17,000件+）を、患者数×4カテゴリ（約2,500行）に削減
CREATE OR REPLACE FUNCTION get_friends_last_messages(p_tenant_id uuid DEFAULT NULL)
RETURNS TABLE(
  patient_id text,
  category text,
  content text,
  sent_at timestamptz,
  event_type text
) AS $$
  -- 1. 最新のincoming時刻（ソート用: direction != 'outgoing'）
  (SELECT DISTINCT ON (m.patient_id)
    m.patient_id, 'incoming_any'::text, NULL::text, m.sent_at, NULL::text
  FROM message_log m
  WHERE m.patient_id IS NOT NULL
    AND m.direction != 'outgoing'
    AND (p_tenant_id IS NULL OR m.tenant_id = p_tenant_id)
  ORDER BY m.patient_id, m.sent_at DESC)

  UNION ALL

  -- 2. 最新の顧客メッセージ（incoming かつ event以外）
  (SELECT DISTINCT ON (m.patient_id)
    m.patient_id, 'incoming_msg'::text, m.content, m.sent_at, NULL::text
  FROM message_log m
  WHERE m.patient_id IS NOT NULL
    AND m.direction = 'incoming'
    AND m.message_type != 'event'
    AND (p_tenant_id IS NULL OR m.tenant_id = p_tenant_id)
  ORDER BY m.patient_id, m.sent_at DESC)

  UNION ALL

  -- 3. 最新のテンプレ送信（outgoing かつ【】形式）
  (SELECT DISTINCT ON (m.patient_id)
    m.patient_id, 'template'::text, m.content, m.sent_at, NULL::text
  FROM message_log m
  WHERE m.patient_id IS NOT NULL
    AND m.direction = 'outgoing'
    AND m.content LIKE '【%'
    AND (p_tenant_id IS NULL OR m.tenant_id = p_tenant_id)
  ORDER BY m.patient_id, m.sent_at DESC)

  UNION ALL

  -- 4. 最新のフォロー/ブロックイベント（systemイベントは除外）
  (SELECT DISTINCT ON (m.patient_id)
    m.patient_id, 'event'::text, m.content, m.sent_at, m.event_type
  FROM message_log m
  WHERE m.patient_id IS NOT NULL
    AND m.direction = 'incoming'
    AND m.message_type = 'event'
    AND (m.event_type IS NULL OR m.event_type != 'system')
    AND (p_tenant_id IS NULL OR m.tenant_id = p_tenant_id)
  ORDER BY m.patient_id, m.sent_at DESC)
$$ LANGUAGE SQL STABLE;
