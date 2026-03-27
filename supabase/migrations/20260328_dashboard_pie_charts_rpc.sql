-- ダッシュボード円グラフ用RPC関数
-- 患者ファネル・処方内訳・決済方法をDB側で集計（行数制限なし）

CREATE OR REPLACE FUNCTION dashboard_pie_charts(
  p_tenant_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  result jsonb;
  v_funnel jsonb;
  v_prescription jsonb;
  v_payment jsonb;

  -- 今月の範囲（JST）
  v_month_start timestamptz;
  v_month_end timestamptz;
  v_now timestamptz := now();
  v_jst_year int;
  v_jst_month int;
BEGIN
  -- JST基準の今月計算
  v_jst_year := EXTRACT(YEAR FROM v_now AT TIME ZONE 'Asia/Tokyo');
  v_jst_month := EXTRACT(MONTH FROM v_now AT TIME ZONE 'Asia/Tokyo');
  v_month_start := make_timestamptz(v_jst_year, v_jst_month, 1, 0, 0, 0, 'Asia/Tokyo');
  v_month_end := make_timestamptz(
    CASE WHEN v_jst_month = 12 THEN v_jst_year + 1 ELSE v_jst_year END,
    CASE WHEN v_jst_month = 12 THEN 1 ELSE v_jst_month + 1 END,
    1, 0, 0, 0, 'Asia/Tokyo'
  );

  -- ============================================================
  -- 1. 患者ファネル（全期間）
  -- ============================================================
  WITH paid_pids AS (
    SELECT DISTINCT patient_id FROM orders
    WHERE tenant_id = p_tenant_id AND paid_at IS NOT NULL
  ),
  intake_agg AS (
    SELECT
      patient_id,
      bool_or(status IN ('OK', 'NG')) AS has_status,
      bool_or(reserve_id IS NOT NULL) AS has_reserve,
      bool_or(answers IS NOT NULL) AS has_answers
    FROM intake
    WHERE tenant_id = p_tenant_id
    GROUP BY patient_id
  ),
  classified AS (
    SELECT
      CASE
        WHEN pp.patient_id IS NOT NULL THEN 7
        WHEN ia.has_status THEN 6
        WHEN ia.has_reserve THEN 5
        WHEN ia.has_answers THEN 4
        WHEN p.tel IS NOT NULL THEN 3
        WHEN p.patient_id NOT LIKE 'LINE_%' THEN 2
        ELSE 1
      END AS step
    FROM patients p
    LEFT JOIN paid_pids pp ON pp.patient_id = p.patient_id
    LEFT JOIN intake_agg ia ON ia.patient_id = p.patient_id
    WHERE p.tenant_id = p_tenant_id
  ),
  step_counts AS (
    SELECT step, count(*) AS cnt FROM classified GROUP BY step
  )
  SELECT jsonb_agg(
    jsonb_build_object('label', labels.label, 'count', COALESCE(sc.cnt, 0))
    ORDER BY labels.sort_order
  )
  INTO v_funnel
  FROM (VALUES
    (1, 'LINE追加のみ'),
    (2, '個人情報入力済み'),
    (3, '電話番号認証済み'),
    (4, '問診済み'),
    (5, '予約済み'),
    (6, '診察済み'),
    (7, '決済済み')
  ) AS labels(sort_order, label)
  LEFT JOIN step_counts sc ON sc.step = labels.sort_order;

  -- ============================================================
  -- 2. 今月の新規処方 vs 再処方（患者単位ユニーク）
  -- ============================================================
  WITH this_month_patients AS (
    SELECT DISTINCT patient_id
    FROM orders
    WHERE tenant_id = p_tenant_id
      AND paid_at IS NOT NULL
      AND paid_at >= v_month_start
      AND paid_at < v_month_end
  ),
  prev_patients AS (
    SELECT DISTINCT patient_id
    FROM orders
    WHERE tenant_id = p_tenant_id
      AND paid_at IS NOT NULL
      AND paid_at < v_month_start
  )
  SELECT jsonb_build_object(
    'newPrescription', count(*) FILTER (WHERE pp.patient_id IS NULL),
    'rePrescription', count(*) FILTER (WHERE pp.patient_id IS NOT NULL)
  )
  INTO v_prescription
  FROM this_month_patients tp
  LEFT JOIN prev_patients pp ON tp.patient_id = pp.patient_id;

  -- ============================================================
  -- 3. 今月の決済方法内訳
  -- ============================================================
  SELECT jsonb_build_object(
    'creditCard', count(*) FILTER (WHERE payment_method IS DISTINCT FROM 'bank_transfer'),
    'bankTransfer', count(*) FILTER (WHERE payment_method = 'bank_transfer'),
    'creditCardAmount', COALESCE(sum(amount) FILTER (WHERE payment_method IS DISTINCT FROM 'bank_transfer'), 0),
    'bankTransferAmount', COALESCE(sum(amount) FILTER (WHERE payment_method = 'bank_transfer'), 0)
  )
  INTO v_payment
  FROM orders
  WHERE tenant_id = p_tenant_id
    AND paid_at IS NOT NULL
    AND paid_at >= v_month_start
    AND paid_at < v_month_end;

  -- 結果を統合
  result := jsonb_build_object(
    'funnel', COALESCE(v_funnel, '[]'::jsonb),
    'prescription', COALESCE(v_prescription, '{"newPrescription":0,"rePrescription":0}'::jsonb),
    'paymentMethod', COALESCE(v_payment, '{"creditCard":0,"bankTransfer":0,"creditCardAmount":0,"bankTransferAmount":0}'::jsonb)
  );

  RETURN result;
END;
$$;
