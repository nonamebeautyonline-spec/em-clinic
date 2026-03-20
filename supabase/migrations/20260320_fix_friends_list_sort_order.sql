-- トーク画面の友だちリスト並び順を修正
-- COALESCE（最初の非null値）→ GREATEST（最新の日時）に変更
-- これにより、フォロー・ブロック解除・ボタンアクション等のイベントでも上に上がるようになる
CREATE OR REPLACE FUNCTION public.get_friends_list_v2(p_tenant_id uuid DEFAULT NULL::uuid, p_search_id text DEFAULT NULL::text, p_search_name text DEFAULT NULL::text, p_limit integer DEFAULT 50, p_offset integer DEFAULT 0)
 RETURNS TABLE(patient_id text, patient_name text, line_id text, line_display_name text, line_picture_url text, mark text, last_msg_content text, last_msg_at timestamp with time zone, last_incoming_at timestamp with time zone, last_template_content text, last_event_content text, last_event_type text, last_outgoing_content text, last_outgoing_at timestamp with time zone)
 LANGUAGE sql
 STABLE
 SET search_path TO 'public'
AS $function$
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
    AND (p_search_id IS NULL OR fs.patient_id ILIKE '%' || p_search_id || '%')
    AND (p_search_name IS NULL OR REPLACE(REPLACE(p.name, ' ', ''), '　', '') ILIKE '%' || REPLACE(REPLACE(p_search_name, ' ', ''), '　', '') || '%')
  ORDER BY GREATEST(fs.last_msg_at, fs.last_incoming_at, fs.last_outgoing_at, '1970-01-01'::timestamptz) DESC
  LIMIT p_limit
  OFFSET p_offset
$function$;
