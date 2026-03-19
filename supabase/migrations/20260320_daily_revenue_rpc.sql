-- daily_revenue_summary: 日別売上集計RPC
-- 4クエリ+メモリ集計をDB側で一括処理
CREATE OR REPLACE FUNCTION daily_revenue_summary(
  p_tenant_id uuid,
  p_start_date date,
  p_end_date date
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  v_start_ts timestamptz;
  v_end_ts   timestamptz;
  v_result   jsonb;
BEGIN
  -- JSTの日付範囲をUTCに変換
  v_start_ts := (p_start_date::text || 'T00:00:00+09:00')::timestamptz;
  v_end_ts   := ((p_end_date + 1)::text || 'T00:00:00+09:00')::timestamptz;

  WITH
  -- 月の全日付を生成
  all_days AS (
    SELECT d::date AS day_date
    FROM generate_series(p_start_date, p_end_date, '1 day'::interval) d
  ),
  -- 期間前に注文がある患者セット（再処方判定）
  previous_patients AS (
    SELECT DISTINCT patient_id
    FROM orders
    WHERE tenant_id = p_tenant_id
      AND created_at < v_start_ts
      AND patient_id IS NOT NULL
  ),
  -- カード決済（paid_atベース）
  square_daily AS (
    SELECT
      (paid_at AT TIME ZONE 'Asia/Tokyo')::date AS day_date,
      COALESCE(SUM(amount), 0) AS square_amount,
      COUNT(*) AS square_count,
      COUNT(*) FILTER (WHERE patient_id IN (SELECT patient_id FROM previous_patients)) AS reorder_sq,
      COUNT(*) FILTER (WHERE patient_id IS NULL OR patient_id NOT IN (SELECT patient_id FROM previous_patients)) AS first_sq
    FROM orders
    WHERE tenant_id = p_tenant_id
      AND payment_method = 'credit_card'
      AND paid_at >= v_start_ts
      AND paid_at < v_end_ts
      AND paid_at IS NOT NULL
    GROUP BY (paid_at AT TIME ZONE 'Asia/Tokyo')::date
  ),
  -- 銀行振込（created_atベース）
  bank_daily AS (
    SELECT
      (created_at AT TIME ZONE 'Asia/Tokyo')::date AS day_date,
      COALESCE(SUM(amount), 0) AS bank_amount,
      COUNT(*) AS bank_count,
      COUNT(*) FILTER (WHERE patient_id IN (SELECT patient_id FROM previous_patients)) AS reorder_bk,
      COUNT(*) FILTER (WHERE patient_id IS NULL OR patient_id NOT IN (SELECT patient_id FROM previous_patients)) AS first_bk
    FROM orders
    WHERE tenant_id = p_tenant_id
      AND payment_method = 'bank_transfer'
      AND status IN ('pending_confirmation', 'confirmed')
      AND created_at >= v_start_ts
      AND created_at < v_end_ts
    GROUP BY (created_at AT TIME ZONE 'Asia/Tokyo')::date
  ),
  -- 返金（refunded_atベース）
  refund_daily AS (
    SELECT
      (refunded_at AT TIME ZONE 'Asia/Tokyo')::date AS day_date,
      COALESCE(SUM(COALESCE(refunded_amount, amount)), 0) AS refund_amount
    FROM orders
    WHERE tenant_id = p_tenant_id
      AND refund_status = 'COMPLETED'
      AND refunded_at >= v_start_ts
      AND refunded_at < v_end_ts
    GROUP BY (refunded_at AT TIME ZONE 'Asia/Tokyo')::date
  ),
  -- 日別統合
  combined AS (
    SELECT
      ad.day_date,
      COALESCE(sq.square_amount, 0)::bigint AS square,
      COALESCE(bk.bank_amount, 0)::bigint   AS bank,
      COALESCE(rf.refund_amount, 0)::bigint  AS refund,
      (COALESCE(sq.square_amount, 0) + COALESCE(bk.bank_amount, 0) - COALESCE(rf.refund_amount, 0))::bigint AS total,
      COALESCE(sq.square_count, 0)::int  AS "squareCount",
      COALESCE(bk.bank_count, 0)::int    AS "bankCount",
      (COALESCE(sq.first_sq, 0) + COALESCE(bk.first_bk, 0))::int     AS "firstCount",
      (COALESCE(sq.reorder_sq, 0) + COALESCE(bk.reorder_bk, 0))::int  AS "reorderCount"
    FROM all_days ad
    LEFT JOIN square_daily sq ON sq.day_date = ad.day_date
    LEFT JOIN bank_daily   bk ON bk.day_date = ad.day_date
    LEFT JOIN refund_daily rf ON rf.day_date = ad.day_date
    ORDER BY ad.day_date
  ),
  -- サマリー
  summary AS (
    SELECT
      COALESCE(SUM(square), 0)::bigint       AS "totalSquare",
      COALESCE(SUM(bank), 0)::bigint         AS "totalBank",
      COALESCE(SUM(refund), 0)::bigint       AS "totalRefund",
      COALESCE(SUM(total), 0)::bigint        AS "totalNet",
      COALESCE(SUM("squareCount"), 0)::int   AS "totalSquareCount",
      COALESCE(SUM("bankCount"), 0)::int     AS "totalBankCount",
      (COALESCE(SUM("squareCount"), 0) + COALESCE(SUM("bankCount"), 0))::int AS "totalCount",
      CASE
        WHEN (COALESCE(SUM("squareCount"), 0) + COALESCE(SUM("bankCount"), 0)) > 0
        THEN ROUND((COALESCE(SUM(square), 0) + COALESCE(SUM(bank), 0))::numeric
             / (COALESCE(SUM("squareCount"), 0) + COALESCE(SUM("bankCount"), 0)))::bigint
        ELSE 0
      END AS "avgOrderValue"
    FROM combined
  )
  SELECT jsonb_build_object(
    'data', (SELECT jsonb_agg(
      jsonb_build_object(
        'date', to_char(c.day_date, 'YYYY-MM-DD'),
        'square', c.square,
        'bank', c.bank,
        'refund', c.refund,
        'total', c.total,
        'squareCount', c."squareCount",
        'bankCount', c."bankCount",
        'firstCount', c."firstCount",
        'reorderCount', c."reorderCount"
      )
    ) FROM combined c),
    'summary', (SELECT row_to_json(s)::jsonb FROM summary s)
  ) INTO v_result;

  RETURN v_result;
END;
$$;
