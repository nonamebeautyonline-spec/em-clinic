-- segments_summary: セグメント別サマリーをDB側で集計
-- API: /api/admin/segments

CREATE OR REPLACE FUNCTION segments_summary(p_tenant_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  result jsonb;
BEGIN
  WITH seg_patients AS (
    -- セグメントデータと患者情報をJOIN
    SELECT
      ps.patient_id,
      ps.segment,
      ps.rfm_score,
      ps.calculated_at,
      p.name,
      p.name_kana,
      p.tel,
      p.line_id
    FROM patient_segments ps
    LEFT JOIN patients p ON p.patient_id = ps.patient_id AND p.tenant_id = p_tenant_id
    WHERE ps.tenant_id = p_tenant_id
  ),
  summary AS (
    -- セグメント別人数
    SELECT
      segment,
      COUNT(*) AS cnt
    FROM seg_patients
    GROUP BY segment
  ),
  segments_json AS (
    -- セグメント別患者リストをJSONB配列に
    SELECT
      segment,
      jsonb_agg(
        jsonb_build_object(
          'patientId', patient_id,
          'name', name,
          'nameKana', name_kana,
          'tel', tel,
          'lineId', line_id,
          'rfmScore', rfm_score,
          'calculatedAt', calculated_at
        )
      ) AS patients
    FROM seg_patients
    GROUP BY segment
  )
  SELECT jsonb_build_object(
    'segments', COALESCE(
      (SELECT jsonb_object_agg(segment, patients) FROM segments_json),
      '{}'::jsonb
    ),
    'summary', COALESCE(
      (SELECT jsonb_object_agg(segment, cnt) FROM summary),
      '{}'::jsonb
    ),
    'total', (SELECT COUNT(*) FROM seg_patients)
  ) INTO result;

  RETURN result;
END;
$$;

-- broadcast_click_stats: 配信別クリック統計をDB側で集計
-- API: /api/admin/line/dashboard

CREATE OR REPLACE FUNCTION broadcast_click_stats(p_tenant_id uuid, p_broadcast_ids int[])
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  result jsonb;
BEGIN
  SELECT COALESCE(
    jsonb_agg(
      jsonb_build_object(
        'broadcast_id', stats.broadcast_id,
        'total_clicks', stats.total_clicks,
        'unique_clicks', stats.unique_clicks
      )
    ),
    '[]'::jsonb
  ) INTO result
  FROM (
    SELECT
      ctl.broadcast_id,
      COUNT(cte.id) AS total_clicks,
      COUNT(DISTINCT cte.ip_address) AS unique_clicks
    FROM click_tracking_links ctl
    INNER JOIN click_tracking_events cte ON cte.link_id = ctl.id AND cte.tenant_id = p_tenant_id
    WHERE ctl.tenant_id = p_tenant_id
      AND ctl.broadcast_id = ANY(p_broadcast_ids)
    GROUP BY ctl.broadcast_id
  ) stats;

  RETURN result;
END;
$$;
