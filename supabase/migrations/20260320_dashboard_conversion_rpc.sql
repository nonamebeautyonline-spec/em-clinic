-- dashboard_conversion_cohorts: 月別コホート転換率をDB側で実行
-- API: /api/admin/dashboard-conversion

CREATE OR REPLACE FUNCTION dashboard_conversion_cohorts(
  p_tenant_id uuid,
  p_months int DEFAULT 12
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  result jsonb;
  v_start_date timestamptz;
  v_jst_offset interval := interval '9 hours';
BEGIN
  -- 起算日（JST基準でp_months前の月初）
  v_start_date := date_trunc('month', (now() AT TIME ZONE 'Asia/Tokyo') - (p_months || ' months')::interval) AT TIME ZONE 'Asia/Tokyo';

  WITH
  -- 全患者の初回注文日（tenant全期間）
  first_orders AS (
    SELECT patient_id, MIN(created_at) AS first_order_at
    FROM orders
    WHERE tenant_id = p_tenant_id AND patient_id IS NOT NULL
    GROUP BY patient_id
  ),
  -- 対象期間の全注文（orders + reorders統合）
  all_transactions AS (
    SELECT patient_id, created_at
    FROM orders
    WHERE tenant_id = p_tenant_id
      AND patient_id IS NOT NULL
      AND created_at >= v_start_date
    UNION ALL
    SELECT patient_id, created_at
    FROM reorders
    WHERE tenant_id = p_tenant_id
      AND patient_id IS NOT NULL
      AND status = 'paid'
      AND created_at >= v_start_date
  ),
  -- 患者ごとの注文日リスト
  patient_dates AS (
    SELECT patient_id, array_agg(created_at ORDER BY created_at) AS dates
    FROM all_transactions
    GROUP BY patient_id
  ),
  -- 月のシリーズ生成
  month_series AS (
    SELECT to_char(d, 'YYYY-MM') AS period,
           to_char(d, 'YYYY') || '/' || EXTRACT(MONTH FROM d)::text AS label,
           d AS month_start,
           d + interval '1 month' AS month_end
    FROM generate_series(
      date_trunc('month', (now() AT TIME ZONE 'Asia/Tokyo') - (p_months || ' months')::interval),
      date_trunc('month', now() AT TIME ZONE 'Asia/Tokyo'),
      interval '1 month'
    ) AS d
  ),
  -- 初診月ごとの新規患者
  cohort_new AS (
    SELECT
      to_char(fo.first_order_at AT TIME ZONE 'Asia/Tokyo', 'YYYY-MM') AS cohort_month,
      fo.patient_id
    FROM first_orders fo
  ),
  -- 再診患者（2回以上の注文がある患者）+ 初回→2回目の日数
  cohort_returned AS (
    SELECT
      cn.cohort_month,
      cn.patient_id,
      ROUND(EXTRACT(EPOCH FROM (pd.dates[2] - pd.dates[1])) / 86400) AS days_to_return
    FROM cohort_new cn
    JOIN patient_dates pd ON pd.patient_id = cn.patient_id
    WHERE array_length(pd.dates, 1) >= 2
  ),
  -- 月別集計
  monthly_stats AS (
    SELECT
      ms.period,
      ms.label,
      COUNT(DISTINCT cn.patient_id) AS new_patients,
      COUNT(DISTINCT cr.patient_id) AS returned_patients,
      CASE
        WHEN COUNT(DISTINCT cn.patient_id) > 0
        THEN ROUND(COUNT(DISTINCT cr.patient_id)::numeric / COUNT(DISTINCT cn.patient_id) * 100)
        ELSE 0
      END AS conversion_rate,
      CASE
        WHEN COUNT(DISTINCT cr.patient_id) > 0
        THEN ROUND(AVG(cr.days_to_return))
        ELSE NULL
      END AS avg_days_to_return
    FROM month_series ms
    LEFT JOIN cohort_new cn ON cn.cohort_month = ms.period
    LEFT JOIN cohort_returned cr ON cr.cohort_month = ms.period AND cr.patient_id = cn.patient_id
    GROUP BY ms.period, ms.label
    ORDER BY ms.period
  ),
  -- 全体集計
  overall AS (
    SELECT
      COALESCE(SUM(new_patients), 0) AS total_new,
      COALESCE(SUM(returned_patients), 0) AS total_returned,
      CASE
        WHEN SUM(new_patients) > 0
        THEN ROUND(SUM(returned_patients)::numeric / SUM(new_patients) * 100)
        ELSE 0
      END AS conversion_rate
    FROM monthly_stats
  )
  SELECT jsonb_build_object(
    'cohorts', (SELECT jsonb_agg(
      jsonb_build_object(
        'period', ms.period,
        'label', ms.label,
        'newPatients', ms.new_patients,
        'returnedPatients', ms.returned_patients,
        'conversionRate', ms.conversion_rate,
        'avgDaysToReturn', ms.avg_days_to_return
      )
    ) FROM monthly_stats ms),
    'overall', jsonb_build_object(
      'totalNew', ov.total_new,
      'totalReturned', ov.total_returned,
      'conversionRate', ov.conversion_rate
    )
  ) INTO result
  FROM overall ov;

  RETURN result;
END;
$$;
