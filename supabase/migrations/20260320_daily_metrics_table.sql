-- daily_metrics: 日次集計テーブル（マテリアライズドビュー相当）
-- cronで毎日リフレッシュし、ダッシュボードの高速表示に利用

-- テーブル作成
CREATE TABLE IF NOT EXISTS daily_metrics (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  tenant_id uuid NOT NULL,
  metric_date date NOT NULL,
  -- 売上
  card_revenue numeric DEFAULT 0,
  bank_revenue numeric DEFAULT 0,
  refund_amount numeric DEFAULT 0,
  -- 注文数
  card_orders int DEFAULT 0,
  bank_orders int DEFAULT 0,
  refund_orders int DEFAULT 0,
  -- 患者
  new_patients int DEFAULT 0,
  returning_patients int DEFAULT 0,
  -- 予約
  total_reservations int DEFAULT 0,
  completed_reservations int DEFAULT 0,
  cancelled_reservations int DEFAULT 0,
  -- 再処方
  reorder_applications int DEFAULT 0,
  reorder_approvals int DEFAULT 0,
  -- タイムスタンプ
  refreshed_at timestamptz DEFAULT now(),
  UNIQUE(tenant_id, metric_date)
);

-- RLS有効化
ALTER TABLE daily_metrics ENABLE ROW LEVEL SECURITY;

-- service_role のみアクセス可
CREATE POLICY service_role_full_access ON daily_metrics
  FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

-- 検索用インデックス
CREATE INDEX IF NOT EXISTS idx_daily_metrics_tenant_date
  ON daily_metrics (tenant_id, metric_date DESC);

-- リフレッシュRPC: 指定テナント・指定日の集計をUPSERT
CREATE OR REPLACE FUNCTION refresh_daily_metrics(
  p_tenant_id uuid,
  p_target_date date DEFAULT CURRENT_DATE
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  v_start_ts timestamptz;
  v_end_ts   timestamptz;
  v_card_revenue numeric := 0;
  v_bank_revenue numeric := 0;
  v_refund_amount numeric := 0;
  v_card_orders int := 0;
  v_bank_orders int := 0;
  v_refund_orders int := 0;
  v_new_patients int := 0;
  v_returning_patients int := 0;
  v_total_reservations int := 0;
  v_completed_reservations int := 0;
  v_cancelled_reservations int := 0;
  v_reorder_applications int := 0;
  v_reorder_approvals int := 0;
BEGIN
  -- JSTの日付範囲をUTCに変換
  v_start_ts := (p_target_date::text || 'T00:00:00+09:00')::timestamptz;
  v_end_ts   := ((p_target_date + 1)::text || 'T00:00:00+09:00')::timestamptz;

  -- カード決済（paid_atベース）
  SELECT
    COALESCE(SUM(amount), 0),
    COUNT(*)
  INTO v_card_revenue, v_card_orders
  FROM orders
  WHERE tenant_id = p_tenant_id
    AND payment_method = 'credit_card'
    AND paid_at >= v_start_ts
    AND paid_at < v_end_ts
    AND paid_at IS NOT NULL;

  -- 銀行振込（created_atベース）
  SELECT
    COALESCE(SUM(amount), 0),
    COUNT(*)
  INTO v_bank_revenue, v_bank_orders
  FROM orders
  WHERE tenant_id = p_tenant_id
    AND payment_method = 'bank_transfer'
    AND status IN ('pending_confirmation', 'confirmed')
    AND created_at >= v_start_ts
    AND created_at < v_end_ts;

  -- 返金
  SELECT
    COALESCE(SUM(COALESCE(refunded_amount, amount)), 0),
    COUNT(*)
  INTO v_refund_amount, v_refund_orders
  FROM orders
  WHERE tenant_id = p_tenant_id
    AND refund_status = 'COMPLETED'
    AND refunded_at >= v_start_ts
    AND refunded_at < v_end_ts;

  -- 新規患者（この日にcreated_atがある + それ以前にordersがない）
  SELECT COUNT(DISTINCT o.patient_id)
  INTO v_new_patients
  FROM orders o
  WHERE o.tenant_id = p_tenant_id
    AND o.created_at >= v_start_ts
    AND o.created_at < v_end_ts
    AND o.patient_id IS NOT NULL
    AND NOT EXISTS (
      SELECT 1 FROM orders prev
      WHERE prev.tenant_id = p_tenant_id
        AND prev.patient_id = o.patient_id
        AND prev.created_at < v_start_ts
    );

  -- リピート患者
  SELECT COUNT(DISTINCT o.patient_id)
  INTO v_returning_patients
  FROM orders o
  WHERE o.tenant_id = p_tenant_id
    AND o.created_at >= v_start_ts
    AND o.created_at < v_end_ts
    AND o.patient_id IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM orders prev
      WHERE prev.tenant_id = p_tenant_id
        AND prev.patient_id = o.patient_id
        AND prev.created_at < v_start_ts
    );

  -- 予約（reservationsテーブル）
  SELECT
    COUNT(*),
    COUNT(*) FILTER (WHERE status = 'completed'),
    COUNT(*) FILTER (WHERE status = 'cancelled')
  INTO v_total_reservations, v_completed_reservations, v_cancelled_reservations
  FROM reservations
  WHERE tenant_id = p_tenant_id
    AND created_at >= v_start_ts
    AND created_at < v_end_ts;

  -- 再処方申請
  SELECT COUNT(*)
  INTO v_reorder_applications
  FROM reorders
  WHERE tenant_id = p_tenant_id
    AND created_at >= v_start_ts
    AND created_at < v_end_ts;

  -- 再処方承認
  SELECT COUNT(*)
  INTO v_reorder_approvals
  FROM reorders
  WHERE tenant_id = p_tenant_id
    AND approved_at >= v_start_ts
    AND approved_at < v_end_ts;

  -- UPSERT
  INSERT INTO daily_metrics (
    tenant_id, metric_date,
    card_revenue, bank_revenue, refund_amount,
    card_orders, bank_orders, refund_orders,
    new_patients, returning_patients,
    total_reservations, completed_reservations, cancelled_reservations,
    reorder_applications, reorder_approvals,
    refreshed_at
  ) VALUES (
    p_tenant_id, p_target_date,
    v_card_revenue, v_bank_revenue, v_refund_amount,
    v_card_orders, v_bank_orders, v_refund_orders,
    v_new_patients, v_returning_patients,
    v_total_reservations, v_completed_reservations, v_cancelled_reservations,
    v_reorder_applications, v_reorder_approvals,
    now()
  )
  ON CONFLICT (tenant_id, metric_date)
  DO UPDATE SET
    card_revenue = EXCLUDED.card_revenue,
    bank_revenue = EXCLUDED.bank_revenue,
    refund_amount = EXCLUDED.refund_amount,
    card_orders = EXCLUDED.card_orders,
    bank_orders = EXCLUDED.bank_orders,
    refund_orders = EXCLUDED.refund_orders,
    new_patients = EXCLUDED.new_patients,
    returning_patients = EXCLUDED.returning_patients,
    total_reservations = EXCLUDED.total_reservations,
    completed_reservations = EXCLUDED.completed_reservations,
    cancelled_reservations = EXCLUDED.cancelled_reservations,
    reorder_applications = EXCLUDED.reorder_applications,
    reorder_approvals = EXCLUDED.reorder_approvals,
    refreshed_at = now();
END;
$$;
