-- dashboard_ltv_stats: 患者別LTV集計をDB側で実行
-- API: /api/admin/dashboard-ltv

CREATE OR REPLACE FUNCTION dashboard_ltv_stats(p_tenant_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  result jsonb;
BEGIN
  WITH patient_ltv AS (
    -- 患者ごとの累計売上・注文回数
    SELECT
      o.patient_id,
      SUM(o.amount) AS total_revenue,
      COUNT(*) AS order_count,
      COALESCE(ps.segment, 'unknown') AS segment
    FROM orders o
    LEFT JOIN patient_segments ps ON ps.patient_id = o.patient_id AND ps.tenant_id = p_tenant_id
    WHERE o.tenant_id = p_tenant_id
      AND o.patient_id IS NOT NULL
      AND o.amount IS NOT NULL
    GROUP BY o.patient_id, ps.segment
  ),
  overview AS (
    SELECT
      COUNT(*) AS total_patients,
      COALESCE(SUM(total_revenue), 0) AS total_revenue,
      CASE WHEN COUNT(*) > 0 THEN ROUND(SUM(total_revenue) / COUNT(*)) ELSE 0 END AS avg_ltv,
      COALESCE(PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY total_revenue), 0) AS median_ltv,
      COALESCE(PERCENTILE_CONT(0.9) WITHIN GROUP (ORDER BY total_revenue), 0) AS top10_threshold
    FROM patient_ltv
  ),
  top10_stats AS (
    SELECT
      CASE WHEN COUNT(*) > 0 THEN ROUND(AVG(total_revenue)) ELSE 0 END AS top10_avg_ltv
    FROM patient_ltv, overview
    WHERE total_revenue >= overview.top10_threshold
  ),
  distribution AS (
    SELECT jsonb_agg(d ORDER BY d.sort_order) AS dist
    FROM (
      SELECT
        r.label AS range,
        COUNT(pl.patient_id) AS count,
        r.sort_order
      FROM (
        VALUES
          (0, 10000, '〜1万', 1),
          (10000, 30000, '1〜3万', 2),
          (30000, 50000, '3〜5万', 3),
          (50000, 100000, '5〜10万', 4),
          (100000, 200000, '10〜20万', 5),
          (200000, 500000, '20〜50万', 6),
          (500000, 2147483647, '50万〜', 7)
      ) AS r(min_val, max_val, label, sort_order)
      LEFT JOIN patient_ltv pl ON pl.total_revenue >= r.min_val AND pl.total_revenue < r.max_val
      GROUP BY r.label, r.sort_order
      HAVING COUNT(pl.patient_id) > 0
    ) d
  ),
  segment_stats AS (
    SELECT jsonb_agg(s ORDER BY s.avg_ltv DESC) AS segs
    FROM (
      SELECT
        segment,
        CASE segment
          WHEN 'vip' THEN 'VIP'
          WHEN 'active' THEN 'アクティブ'
          WHEN 'churn_risk' THEN '離脱リスク'
          WHEN 'dormant' THEN '休眠'
          WHEN 'new' THEN '新規'
          ELSE segment
        END AS label,
        CASE WHEN COUNT(*) > 0 THEN ROUND(SUM(total_revenue) / COUNT(*)) ELSE 0 END AS avg_ltv,
        SUM(total_revenue) AS total_revenue,
        COUNT(*) AS patient_count,
        CASE WHEN COUNT(*) > 0 THEN ROUND(SUM(order_count)::numeric / COUNT(*), 1) ELSE 0 END AS avg_orders
      FROM patient_ltv
      GROUP BY segment
    ) s
  )
  SELECT jsonb_build_object(
    'overview', jsonb_build_object(
      'totalPatients', o.total_patients,
      'totalRevenue', o.total_revenue,
      'avgLTV', o.avg_ltv,
      'medianLTV', o.median_ltv,
      'top10AvgLTV', t.top10_avg_ltv
    ),
    'distribution', COALESCE(d.dist, '[]'::jsonb),
    'segments', COALESCE(ss.segs, '[]'::jsonb)
  ) INTO result
  FROM overview o, top10_stats t, distribution d, segment_stats ss;

  RETURN result;
END;
$$;
