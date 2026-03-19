-- dashboard_revenue_trends: 月別/年別売上トレンドをDB側で実行
-- API: /api/admin/dashboard-trends

CREATE OR REPLACE FUNCTION dashboard_revenue_trends(
  p_tenant_id uuid,
  p_mode text DEFAULT 'monthly',
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
  v_end_date timestamptz;
BEGIN
  IF p_mode = 'yearly' THEN
    -- 年別: 過去5年 + 今年
    v_start_date := date_trunc('year', (now() AT TIME ZONE 'Asia/Tokyo') - interval '5 years') AT TIME ZONE 'Asia/Tokyo';
    v_end_date := (date_trunc('year', (now() AT TIME ZONE 'Asia/Tokyo')) + interval '1 year') AT TIME ZONE 'Asia/Tokyo';

    WITH
    year_series AS (
      SELECT
        to_char(d, 'YYYY') AS period,
        to_char(d, 'YYYY') || '年' AS label,
        d AS period_start,
        d + interval '1 year' AS period_end
      FROM generate_series(
        date_trunc('year', (now() AT TIME ZONE 'Asia/Tokyo') - interval '5 years'),
        date_trunc('year', now() AT TIME ZONE 'Asia/Tokyo'),
        interval '1 year'
      ) AS d
    ),
    square_agg AS (
      SELECT
        to_char(o.paid_at AT TIME ZONE 'Asia/Tokyo', 'YYYY') AS period,
        COALESCE(SUM(o.amount), 0) AS square,
        COUNT(*) AS order_count,
        COUNT(DISTINCT o.patient_id) AS unique_patients
      FROM orders o
      WHERE o.tenant_id = p_tenant_id
        AND o.payment_method = 'credit_card'
        AND o.paid_at IS NOT NULL
        AND o.paid_at >= v_start_date AND o.paid_at < v_end_date
      GROUP BY to_char(o.paid_at AT TIME ZONE 'Asia/Tokyo', 'YYYY')
    ),
    bank_agg AS (
      SELECT
        to_char(o.created_at AT TIME ZONE 'Asia/Tokyo', 'YYYY') AS period,
        COALESCE(SUM(o.amount), 0) AS bank_transfer,
        COUNT(*) AS order_count,
        COUNT(DISTINCT o.patient_id) AS unique_patients
      FROM orders o
      WHERE o.tenant_id = p_tenant_id
        AND o.payment_method = 'bank_transfer'
        AND o.status IN ('pending_confirmation', 'confirmed')
        AND o.created_at >= v_start_date AND o.created_at < v_end_date
      GROUP BY to_char(o.created_at AT TIME ZONE 'Asia/Tokyo', 'YYYY')
    ),
    refund_agg AS (
      SELECT
        to_char(o.refunded_at AT TIME ZONE 'Asia/Tokyo', 'YYYY') AS period,
        COALESCE(SUM(COALESCE(o.refunded_amount, o.amount)), 0) AS refunded
      FROM orders o
      WHERE o.tenant_id = p_tenant_id
        AND o.refund_status = 'COMPLETED'
        AND o.refunded_at >= v_start_date AND o.refunded_at < v_end_date
      GROUP BY to_char(o.refunded_at AT TIME ZONE 'Asia/Tokyo', 'YYYY')
    ),
    trends AS (
      SELECT
        ys.period,
        ys.label,
        COALESCE(sq.square, 0) AS square,
        COALESCE(ba.bank_transfer, 0) AS bank_transfer,
        COALESCE(sq.square, 0) + COALESCE(ba.bank_transfer, 0) - COALESCE(ra.refunded, 0) AS total,
        COALESCE(sq.square, 0) + COALESCE(ba.bank_transfer, 0) AS gross,
        COALESCE(ra.refunded, 0) AS refunded,
        COALESCE(sq.order_count, 0) + COALESCE(ba.order_count, 0) AS order_count,
        -- unique_patients: union of both sets (approximate, may double-count)
        GREATEST(COALESCE(sq.unique_patients, 0), COALESCE(ba.unique_patients, 0)) AS unique_patients
      FROM year_series ys
      LEFT JOIN square_agg sq ON sq.period = ys.period
      LEFT JOIN bank_agg ba ON ba.period = ys.period
      LEFT JOIN refund_agg ra ON ra.period = ys.period
      ORDER BY ys.period
    ),
    trends_arr AS (
      SELECT jsonb_agg(
        jsonb_build_object(
          'period', t.period,
          'label', t.label,
          'square', t.square,
          'bankTransfer', t.bank_transfer,
          'total', t.total,
          'gross', t.gross,
          'refunded', t.refunded,
          'orderCount', t.order_count,
          'uniquePatients', t.unique_patients
        )
      ) AS arr
      FROM trends t
    ),
    current_period AS (
      SELECT * FROM trends ORDER BY period DESC LIMIT 1
    ),
    previous_period AS (
      SELECT * FROM trends ORDER BY period DESC OFFSET 1 LIMIT 1
    )
    SELECT jsonb_build_object(
      'granularity', 'yearly',
      'trends', COALESCE(ta.arr, '[]'::jsonb),
      'comparison', jsonb_build_object(
        'yoy', CASE
          WHEN pp.total IS NULL THEN NULL
          WHEN pp.total = 0 AND cp.total = 0 THEN jsonb_build_object('amount', 0, 'rate', 0)
          WHEN pp.total = 0 THEN jsonb_build_object('amount', cp.total, 'rate', 100)
          ELSE jsonb_build_object('amount', cp.total - pp.total, 'rate', ROUND((cp.total - pp.total)::numeric / pp.total * 100))
        END
      ),
      'currentPeriod', CASE WHEN cp.period IS NOT NULL THEN
        jsonb_build_object(
          'period', cp.period, 'label', cp.label,
          'square', cp.square, 'bankTransfer', cp.bank_transfer,
          'total', cp.total, 'gross', cp.gross, 'refunded', cp.refunded,
          'orderCount', cp.order_count, 'uniquePatients', cp.unique_patients
        )
      ELSE NULL END
    ) INTO result
    FROM trends_arr ta
    LEFT JOIN current_period cp ON true
    LEFT JOIN previous_period pp ON true;

  ELSE
    -- 月別（デフォルト）
    v_start_date := date_trunc('month', (now() AT TIME ZONE 'Asia/Tokyo') - (p_months || ' months')::interval) AT TIME ZONE 'Asia/Tokyo';
    v_end_date := (date_trunc('month', (now() AT TIME ZONE 'Asia/Tokyo')) + interval '1 month') AT TIME ZONE 'Asia/Tokyo';

    WITH
    month_series AS (
      SELECT
        to_char(d, 'YYYY-MM') AS period,
        to_char(d, 'YYYY') || '/' || EXTRACT(MONTH FROM d)::text AS label,
        d AS period_start,
        d + interval '1 month' AS period_end
      FROM generate_series(
        date_trunc('month', (now() AT TIME ZONE 'Asia/Tokyo') - (p_months || ' months')::interval),
        date_trunc('month', now() AT TIME ZONE 'Asia/Tokyo'),
        interval '1 month'
      ) AS d
    ),
    square_agg AS (
      SELECT
        to_char(o.paid_at AT TIME ZONE 'Asia/Tokyo', 'YYYY-MM') AS period,
        COALESCE(SUM(o.amount), 0) AS square,
        COUNT(*) AS order_count,
        COUNT(DISTINCT o.patient_id) AS unique_patients
      FROM orders o
      WHERE o.tenant_id = p_tenant_id
        AND o.payment_method = 'credit_card'
        AND o.paid_at IS NOT NULL
        AND o.paid_at >= v_start_date AND o.paid_at < v_end_date
      GROUP BY to_char(o.paid_at AT TIME ZONE 'Asia/Tokyo', 'YYYY-MM')
    ),
    bank_agg AS (
      SELECT
        to_char(o.created_at AT TIME ZONE 'Asia/Tokyo', 'YYYY-MM') AS period,
        COALESCE(SUM(o.amount), 0) AS bank_transfer,
        COUNT(*) AS order_count,
        COUNT(DISTINCT o.patient_id) AS unique_patients
      FROM orders o
      WHERE o.tenant_id = p_tenant_id
        AND o.payment_method = 'bank_transfer'
        AND o.status IN ('pending_confirmation', 'confirmed')
        AND o.created_at >= v_start_date AND o.created_at < v_end_date
      GROUP BY to_char(o.created_at AT TIME ZONE 'Asia/Tokyo', 'YYYY-MM')
    ),
    refund_agg AS (
      SELECT
        to_char(o.refunded_at AT TIME ZONE 'Asia/Tokyo', 'YYYY-MM') AS period,
        COALESCE(SUM(COALESCE(o.refunded_amount, o.amount)), 0) AS refunded
      FROM orders o
      WHERE o.tenant_id = p_tenant_id
        AND o.refund_status = 'COMPLETED'
        AND o.refunded_at >= v_start_date AND o.refunded_at < v_end_date
      GROUP BY to_char(o.refunded_at AT TIME ZONE 'Asia/Tokyo', 'YYYY-MM')
    ),
    trends AS (
      SELECT
        ms.period,
        ms.label,
        COALESCE(sq.square, 0) AS square,
        COALESCE(ba.bank_transfer, 0) AS bank_transfer,
        COALESCE(sq.square, 0) + COALESCE(ba.bank_transfer, 0) - COALESCE(ra.refunded, 0) AS total,
        COALESCE(sq.square, 0) + COALESCE(ba.bank_transfer, 0) AS gross,
        COALESCE(ra.refunded, 0) AS refunded,
        COALESCE(sq.order_count, 0) + COALESCE(ba.order_count, 0) AS order_count,
        GREATEST(COALESCE(sq.unique_patients, 0), COALESCE(ba.unique_patients, 0)) AS unique_patients
      FROM month_series ms
      LEFT JOIN square_agg sq ON sq.period = ms.period
      LEFT JOIN bank_agg ba ON ba.period = ms.period
      LEFT JOIN refund_agg ra ON ra.period = ms.period
      ORDER BY ms.period
    ),
    trends_arr AS (
      SELECT jsonb_agg(
        jsonb_build_object(
          'period', t.period,
          'label', t.label,
          'square', t.square,
          'bankTransfer', t.bank_transfer,
          'total', t.total,
          'gross', t.gross,
          'refunded', t.refunded,
          'orderCount', t.order_count,
          'uniquePatients', t.unique_patients
        )
      ) AS arr
      FROM trends t
    ),
    current_period AS (
      SELECT * FROM trends ORDER BY period DESC LIMIT 1
    ),
    previous_period AS (
      SELECT * FROM trends ORDER BY period DESC OFFSET 1 LIMIT 1
    ),
    yoy_period AS (
      SELECT * FROM trends ORDER BY period ASC LIMIT 1
    )
    SELECT jsonb_build_object(
      'granularity', 'monthly',
      'trends', COALESCE(ta.arr, '[]'::jsonb),
      'comparison', jsonb_build_object(
        'mom', CASE
          WHEN pp.total IS NULL THEN NULL
          WHEN pp.total = 0 AND cp.total = 0 THEN jsonb_build_object('amount', 0, 'rate', 0)
          WHEN pp.total = 0 THEN jsonb_build_object('amount', cp.total, 'rate', 100)
          ELSE jsonb_build_object('amount', cp.total - pp.total, 'rate', ROUND((cp.total - pp.total)::numeric / pp.total * 100))
        END,
        'yoy', CASE
          WHEN p_months < 12 THEN NULL
          WHEN yp.total IS NULL THEN NULL
          WHEN yp.total = 0 AND cp.total = 0 THEN jsonb_build_object('amount', 0, 'rate', 0)
          WHEN yp.total = 0 THEN jsonb_build_object('amount', cp.total, 'rate', 100)
          ELSE jsonb_build_object('amount', cp.total - yp.total, 'rate', ROUND((cp.total - yp.total)::numeric / yp.total * 100))
        END
      ),
      'currentPeriod', CASE WHEN cp.period IS NOT NULL THEN
        jsonb_build_object(
          'period', cp.period, 'label', cp.label,
          'square', cp.square, 'bankTransfer', cp.bank_transfer,
          'total', cp.total, 'gross', cp.gross, 'refunded', cp.refunded,
          'orderCount', cp.order_count, 'uniquePatients', cp.unique_patients
        )
      ELSE NULL END
    ) INTO result
    FROM trends_arr ta
    LEFT JOIN current_period cp ON true
    LEFT JOIN previous_period pp ON true
    LEFT JOIN yoy_period yp ON true;

  END IF;

  RETURN result;
END;
$$;
