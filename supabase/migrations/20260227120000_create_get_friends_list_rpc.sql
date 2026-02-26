-- 友だちリスト用RPC: friend_summaries + patients + patient_marks を1クエリでJOIN
-- 旧方式: 4テーブル個別SELECT → 新方式: 1 RPC（DB往復1回）
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
  last_event_type text
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
    fs.last_event_type
  FROM friend_summaries fs
  JOIN patients p ON p.patient_id = fs.patient_id
  LEFT JOIN patient_marks pm ON pm.patient_id = fs.patient_id
  WHERE (p_tenant_id IS NULL OR fs.tenant_id = p_tenant_id)
$$ LANGUAGE SQL STABLE;
