-- analytics RPC関数: LTV・コホート・商品別売上をDB側で集計
-- API: /api/admin/analytics

-- ============================================================
-- 1. analytics_ltv: 患者LTV分析
-- ============================================================
CREATE OR REPLACE FUNCTION analytics_ltv(
  p_tenant_id uuid,
  p_start_date date DEFAULT NULL,
  p_end_date date DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  result jsonb;
BEGIN
  WITH patient_ltv AS (
    -- 患者ごとの累計売上（返金差し引き）・注文回数
    SELECT
      o.patient_id,
      SUM(
        COALESCE(o.amount, 0)
        - CASE WHEN o.refund_status = 'COMPLETED' THEN COALESCE(o.refunded_amount, 0) ELSE 0 END
      ) AS total,
      COUNT(*) AS order_count
    FROM orders o
    WHERE o.patient_id IS NOT NULL
      AND o.paid_at IS NOT NULL
      AND (p_tenant_id IS NULL OR o.tenant_id = p_tenant_id)
      AND (p_start_date IS NULL OR o.paid_at >= p_start_date::timestamptz)
      AND (p_end_date IS NULL OR o.paid_at < (p_end_date + 1)::timestamptz)
    GROUP BY o.patient_id
  ),
  overview AS (
    SELECT
      COUNT(*) AS total_patients,
      COALESCE(SUM(total), 0) AS total_revenue,
      CASE WHEN COUNT(*) > 0 THEN ROUND(SUM(total) / COUNT(*)) ELSE 0 END AS avg_ltv,
      COALESCE(PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY total), 0) AS median_ltv,
      COALESCE(MAX(total), 0) AS max_ltv
    FROM patient_ltv
  ),
  avg_orders AS (
    SELECT
      CASE WHEN COUNT(*) > 0
        THEN ROUND(SUM(order_count)::numeric / COUNT(*), 1)
        ELSE 0
      END AS avg_orders
    FROM patient_ltv
  ),
  -- LTV分布バケット
  distribution AS (
    SELECT jsonb_agg(d ORDER BY d.sort_order) AS dist
    FROM (
      SELECT
        r.label,
        COUNT(pl.patient_id) AS count,
        r.sort_order
      FROM (
        VALUES
          (0,      5000,       '¥0〜',        1),
          (5000,   10000,      '¥5,000〜',    2),
          (10000,  20000,      '¥10,000〜',   3),
          (20000,  30000,      '¥20,000〜',   4),
          (30000,  50000,      '¥30,000〜',   5),
          (50000,  100000,     '¥50,000〜',   6),
          (100000, 200000,     '¥100,000〜',  7),
          (200000, 2147483647, '20万〜',       8)
      ) AS r(min_val, max_val, label, sort_order)
      LEFT JOIN patient_ltv pl ON pl.total >= r.min_val AND pl.total < r.max_val
      GROUP BY r.label, r.sort_order
    ) d
  ),
  -- リピーター分布
  repeat_distribution AS (
    SELECT jsonb_agg(rd ORDER BY rd.sort_order) AS rdist
    FROM (
      SELECT r.label, COUNT(pl.patient_id) AS count, r.sort_order
      FROM (
        VALUES
          (1, 1,          '1回',    1),
          (2, 2,          '2回',    2),
          (3, 3,          '3回',    3),
          (4, 2147483647, '4回以上', 4)
      ) AS r(min_val, max_val, label, sort_order)
      LEFT JOIN patient_ltv pl ON pl.order_count >= r.min_val AND pl.order_count <= r.max_val
      GROUP BY r.label, r.sort_order
    ) rd
  )
  SELECT jsonb_build_object(
    'avgLtv', o.avg_ltv,
    'avgOrders', ao.avg_orders,
    'medianLtv', o.median_ltv,
    'maxLtv', o.max_ltv,
    'totalPatients', o.total_patients,
    'totalRevenue', o.total_revenue,
    'distribution', COALESCE(d.dist, '[]'::jsonb),
    'repeatDist', COALESCE(rd.rdist, '[]'::jsonb)
  ) INTO result
  FROM overview o, avg_orders ao, distribution d, repeat_distribution rd;

  RETURN result;
END;
$$;

-- ============================================================
-- 2. analytics_cohort: コホート分析（月別リテンション）
-- ============================================================
CREATE OR REPLACE FUNCTION analytics_cohort(
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
BEGIN
  WITH patient_first_month AS (
    -- 患者ごとの初回購入月
    SELECT
      patient_id,
      DATE_TRUNC('month', MIN(paid_at))::date AS first_month
    FROM orders
    WHERE patient_id IS NOT NULL
      AND paid_at IS NOT NULL
      AND (p_tenant_id IS NULL OR tenant_id = p_tenant_id)
    GROUP BY patient_id
  ),
  patient_months AS (
    -- 患者ごとの購入月リスト
    SELECT DISTINCT
      patient_id,
      DATE_TRUNC('month', paid_at)::date AS order_month
    FROM orders
    WHERE patient_id IS NOT NULL
      AND paid_at IS NOT NULL
      AND (p_tenant_id IS NULL OR tenant_id = p_tenant_id)
  ),
  cohort_list AS (
    -- 直近N月のコホートを取得
    SELECT DISTINCT first_month AS cohort_month
    FROM patient_first_month
    ORDER BY first_month DESC
    LIMIT p_months
  ),
  cohort_sizes AS (
    SELECT
      pf.first_month AS cohort_month,
      COUNT(*) AS initial_count
    FROM patient_first_month pf
    WHERE pf.first_month IN (SELECT cohort_month FROM cohort_list)
    GROUP BY pf.first_month
  ),
  retention_data AS (
    -- 各コホート×月オフセットのリテンション人数
    SELECT
      pf.first_month AS cohort_month,
      (EXTRACT(YEAR FROM pm.order_month) - EXTRACT(YEAR FROM pf.first_month)) * 12
        + (EXTRACT(MONTH FROM pm.order_month) - EXTRACT(MONTH FROM pf.first_month)) AS month_offset,
      COUNT(DISTINCT pm.patient_id) AS retained_count
    FROM patient_first_month pf
    JOIN patient_months pm ON pm.patient_id = pf.patient_id
    WHERE pf.first_month IN (SELECT cohort_month FROM cohort_list)
      AND pm.order_month >= pf.first_month
      AND pm.order_month < pf.first_month + INTERVAL '6 months'
    GROUP BY pf.first_month, month_offset
  ),
  cohort_json AS (
    SELECT jsonb_agg(
      jsonb_build_object(
        'month', TO_CHAR(cs.cohort_month, 'YYYY-MM'),
        'size', cs.initial_count,
        'retention', (
          SELECT COALESCE(jsonb_agg(
            jsonb_build_object(
              'monthOffset', rd.month_offset,
              'rate', CASE WHEN cs.initial_count > 0
                THEN ROUND((rd.retained_count::numeric / cs.initial_count) * 100)
                ELSE 0 END
            ) ORDER BY rd.month_offset
          ), '[]'::jsonb)
          FROM retention_data rd
          WHERE rd.cohort_month = cs.cohort_month
        )
      ) ORDER BY cs.cohort_month
    ) AS cohorts
    FROM cohort_sizes cs
  )
  SELECT COALESCE(cohorts, '[]'::jsonb) INTO result FROM cohort_json;

  RETURN result;
END;
$$;

-- ============================================================
-- 3. analytics_product_breakdown: 商品別売上内訳
-- ============================================================
CREATE OR REPLACE FUNCTION analytics_product_breakdown(
  p_tenant_id uuid,
  p_start_date date DEFAULT NULL,
  p_end_date date DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  result jsonb;
BEGIN
  WITH product_stats AS (
    SELECT
      COALESCE(o.product_code, '不明') AS code,
      COALESCE(p.title, o.product_code, '不明') AS product_name,
      COUNT(*) AS order_count,
      SUM(
        COALESCE(o.amount, 0)
        - CASE WHEN o.refund_status = 'COMPLETED' THEN COALESCE(o.refunded_amount, 0) ELSE 0 END
      ) AS revenue
    FROM orders o
    LEFT JOIN products p ON p.code = o.product_code
      AND (p_tenant_id IS NULL OR p.tenant_id = p_tenant_id)
    WHERE o.paid_at IS NOT NULL
      AND (p_tenant_id IS NULL OR o.tenant_id = p_tenant_id)
      AND (p_start_date IS NULL OR o.paid_at >= p_start_date::timestamptz)
      AND (p_end_date IS NULL OR o.paid_at < (p_end_date + 1)::timestamptz)
    GROUP BY code, product_name
    ORDER BY revenue DESC
  )
  SELECT COALESCE(
    jsonb_agg(
      jsonb_build_object(
        'code', ps.code,
        'product_name', ps.product_name,
        'revenue', ps.revenue,
        'count', ps.order_count
      )
    ),
    '[]'::jsonb
  ) INTO result
  FROM product_stats ps;

  RETURN result;
END;
$$;
