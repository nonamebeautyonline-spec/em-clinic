-- 既存のURIタップイベントのevent_typeをsystem→trackに更新
-- これによりfriend_summariesのトリガー条件(event_type != 'system')に合致するようになる
UPDATE message_log
SET event_type = 'track'
WHERE event_type = 'system'
  AND content LIKE '「%」をタップしました';

-- friend_summariesのlast_event_*を最新の非systemイベントで再計算
WITH latest_event AS (
  SELECT DISTINCT ON (patient_id)
    patient_id, tenant_id, content, sent_at, event_type
  FROM message_log
  WHERE direction = 'incoming'
    AND message_type = 'event'
    AND (event_type IS NULL OR event_type != 'system')
    AND patient_id IS NOT NULL
  ORDER BY patient_id, sent_at DESC
)
UPDATE friend_summaries fs
SET last_event_content = le.content,
    last_event_at = le.sent_at,
    last_event_type = le.event_type
FROM latest_event le
WHERE fs.patient_id = le.patient_id;
