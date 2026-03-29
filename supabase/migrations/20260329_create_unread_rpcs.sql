-- 未読カウントRPC（SQL JOIN版 — PostgREST 5000行制限を回避）
CREATE OR REPLACE FUNCTION public.count_unread_patients(p_tenant_id uuid)
RETURNS integer
LANGUAGE sql STABLE
SET search_path = 'public'
AS $$
  SELECT count(*)::int
  FROM friend_summaries fs
  LEFT JOIN chat_reads cr ON cr.patient_id = fs.patient_id AND cr.tenant_id = fs.tenant_id
  WHERE fs.tenant_id = p_tenant_id
    AND fs.last_msg_at IS NOT NULL
    AND (cr.read_at IS NULL OR fs.last_msg_at > cr.read_at);
$$;

-- 未読患者ID一覧RPC（SQL JOIN版）
CREATE OR REPLACE FUNCTION public.get_unread_patient_ids(p_tenant_id uuid)
RETURNS TABLE(patient_id varchar(20), last_msg_at timestamptz)
LANGUAGE sql STABLE
SET search_path = 'public'
AS $$
  SELECT fs.patient_id, fs.last_msg_at
  FROM friend_summaries fs
  LEFT JOIN chat_reads cr ON cr.patient_id = fs.patient_id AND cr.tenant_id = fs.tenant_id
  WHERE fs.tenant_id = p_tenant_id
    AND fs.last_msg_at IS NOT NULL
    AND (cr.read_at IS NULL OR fs.last_msg_at > cr.read_at);
$$;
