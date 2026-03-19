-- ダッシュボード統計用RPC関数
-- 本日配送の新規/リピート判定（N+1解消）

CREATE OR REPLACE FUNCTION public.get_today_shipping_stats(
  p_tenant_id uuid,
  p_today_start date,
  p_today_end date
)
RETURNS TABLE(
  total_count bigint,
  first_order_count bigint,
  reorder_count bigint
)
LANGUAGE sql STABLE
SET search_path TO 'public'
AS $$
  WITH today_orders AS (
    SELECT DISTINCT patient_id
    FROM orders
    WHERE tenant_id = p_tenant_id
      AND shipping_date >= p_today_start
      AND shipping_date < p_today_end
  ),
  patient_classification AS (
    SELECT
      tp.patient_id,
      EXISTS (
        SELECT 1 FROM orders o2
        WHERE o2.tenant_id = p_tenant_id
          AND o2.patient_id = tp.patient_id
          AND o2.created_at < p_today_start::timestamptz
      ) AS has_prior_order
    FROM today_orders tp
  )
  SELECT
    (SELECT count(*) FROM today_orders)::bigint AS total_count,
    (SELECT count(*) FROM patient_classification WHERE NOT has_prior_order)::bigint AS first_order_count,
    (SELECT count(*) FROM patient_classification WHERE has_prior_order)::bigint AS reorder_count;
$$;

-- 月次リピート率計算（N+1解消）

CREATE OR REPLACE FUNCTION public.get_monthly_repeat_rate(
  p_tenant_id uuid,
  p_month_start timestamptz
)
RETURNS TABLE(
  total_patients bigint,
  repeat_patients bigint,
  repeat_rate integer
)
LANGUAGE sql STABLE
SET search_path TO 'public'
AS $$
  WITH month_patients AS (
    SELECT DISTINCT patient_id
    FROM orders
    WHERE tenant_id = p_tenant_id
      AND paid_at >= p_month_start
  ),
  patient_classification AS (
    SELECT
      mp.patient_id,
      EXISTS (
        SELECT 1 FROM orders o2
        WHERE o2.tenant_id = p_tenant_id
          AND o2.patient_id = mp.patient_id
          AND o2.created_at < p_month_start
      ) AS is_repeat
    FROM month_patients mp
  )
  SELECT
    (SELECT count(*) FROM month_patients)::bigint AS total_patients,
    (SELECT count(*) FROM patient_classification WHERE is_repeat)::bigint AS repeat_patients,
    CASE
      WHEN (SELECT count(*) FROM month_patients) = 0 THEN 0
      ELSE round((SELECT count(*) FROM patient_classification WHERE is_repeat)::numeric / (SELECT count(*) FROM month_patients) * 100)::integer
    END AS repeat_rate;
$$;

-- パフォーマンス用インデックス
CREATE INDEX IF NOT EXISTS idx_orders_tenant_shipping_date
  ON orders(tenant_id, shipping_date);

CREATE INDEX IF NOT EXISTS idx_orders_tenant_paid_at
  ON orders(tenant_id, paid_at);

CREATE INDEX IF NOT EXISTS idx_orders_tenant_patient_created
  ON orders(tenant_id, patient_id, created_at);
