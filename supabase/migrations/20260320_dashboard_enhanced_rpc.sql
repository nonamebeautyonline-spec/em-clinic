-- dashboard_enhanced_stats RPC関数
-- 24個の並列クエリを1つのRPC関数に統合してDB負荷を削減
CREATE OR REPLACE FUNCTION dashboard_enhanced_stats(
  p_tenant_id uuid,
  p_start_iso timestamptz,
  p_end_iso timestamptz,
  p_prev_start_iso timestamptz,
  p_prev_end_iso timestamptz,
  p_reservation_start_date date,
  p_reservation_end_date date,
  p_shipping_start_date date,
  p_shipping_end_date date
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  result jsonb;

  -- カウント系
  v_total_reservations int;
  v_cancelled_reservations int;
  v_shipping_total int;
  v_total_patients int;
  v_pending_bt int;
  v_confirmed_bt int;
  v_today_active_reservations int;
  v_today_new_reservations int;

  -- データ行系
  v_completed_ok_ids text[];
  v_completed_ng_ids text[];
  v_no_answer_ids text[];
  v_line_followers int;

  -- 集計用変数
  v_completed_ok_count int;
  v_completed_ng_count int;
  v_no_answer_count int;
  v_completed_reservations int;
  v_cancel_rate int;
  v_new_patients int;

  -- 売上
  v_square_revenue bigint;
  v_bt_revenue bigint;
  v_gross_revenue bigint;
  v_total_refunded bigint;
  v_refund_count int;
  v_total_revenue bigint;
  v_square_order_count int;
  v_bt_order_count int;
  v_order_count int;
  v_avg_order_amount int;

  -- 配送
  v_shipping_first int;
  v_shipping_reorder int;

  -- リピート
  v_prev_period_patient_ids text[];
  v_current_period_patient_ids text[];
  v_repeat_patient_count int;
  v_repeat_rate int;
  v_total_unique_patients int;
  v_reorder_order_count int;
  v_active_patients int;

  -- KPI
  v_consulted_patient_ids text[];
  v_intake_patient_ids text[];
  v_paid_patient_count int;
  v_consulted_count int;
  v_payment_rate_after_consultation int;
  v_reserved_patient_count int;
  v_intake_count int;
  v_reservation_rate_after_intake int;
  v_non_cancelled_reservations int;
  v_consultation_completion_rate int;
  v_today_paid_count int;

  -- 配送の前期間
  v_shipping_patient_ids text[];
  v_paid_patient_ids text[];
  v_prev_paid_patient_ids text[];

  -- 商品別・日別データ
  v_products jsonb;
  v_square_orders jsonb;
  v_bt_orders jsonb;
  v_daily_orders jsonb;
  v_daily_breakdown jsonb;
BEGIN
  -- ============================================================
  -- バッチ1: 独立した全クエリ
  -- ============================================================

  -- 1. 予約総数
  SELECT count(*) INTO v_total_reservations
  FROM reservations
  WHERE tenant_id = p_tenant_id
    AND reserved_date >= p_reservation_start_date
    AND reserved_date < p_reservation_end_date;

  -- 2. 診察完了（OK）
  SELECT array_agg(patient_id) INTO v_completed_ok_ids
  FROM reservations
  WHERE tenant_id = p_tenant_id
    AND reserved_date >= p_reservation_start_date
    AND reserved_date < p_reservation_end_date
    AND status = 'OK';
  v_completed_ok_ids := COALESCE(v_completed_ok_ids, ARRAY[]::text[]);
  v_completed_ok_count := array_length(v_completed_ok_ids, 1);
  IF v_completed_ok_count IS NULL THEN v_completed_ok_count := 0; END IF;

  -- 3. 診察完了（NG）
  SELECT array_agg(patient_id) INTO v_completed_ng_ids
  FROM reservations
  WHERE tenant_id = p_tenant_id
    AND reserved_date >= p_reservation_start_date
    AND reserved_date < p_reservation_end_date
    AND status = 'NG';
  v_completed_ng_ids := COALESCE(v_completed_ng_ids, ARRAY[]::text[]);
  v_completed_ng_count := array_length(v_completed_ng_ids, 1);
  IF v_completed_ng_count IS NULL THEN v_completed_ng_count := 0; END IF;

  -- 完了患者数（ユニーク）
  SELECT count(DISTINCT pid) INTO v_completed_reservations
  FROM unnest(v_completed_ok_ids || v_completed_ng_ids) AS pid
  WHERE pid IS NOT NULL;

  -- 4. キャンセル数
  SELECT count(*) INTO v_cancelled_reservations
  FROM reservations
  WHERE tenant_id = p_tenant_id
    AND reserved_date >= p_reservation_start_date
    AND reserved_date < p_reservation_end_date
    AND status = 'canceled';

  -- キャンセル率
  IF v_total_reservations > 0 THEN
    v_cancel_rate := round((v_cancelled_reservations::numeric / v_total_reservations) * 100);
  ELSE
    v_cancel_rate := 0;
  END IF;

  -- 5. 配送総数
  SELECT count(*) INTO v_shipping_total
  FROM orders
  WHERE tenant_id = p_tenant_id
    AND shipping_date >= p_shipping_start_date
    AND shipping_date < p_shipping_end_date;

  -- 6. 配送注文データ（patient_id一覧）
  SELECT array_agg(DISTINCT patient_id) INTO v_shipping_patient_ids
  FROM orders
  WHERE tenant_id = p_tenant_id
    AND shipping_date >= p_shipping_start_date
    AND shipping_date < p_shipping_end_date
    AND patient_id IS NOT NULL;
  v_shipping_patient_ids := COALESCE(v_shipping_patient_ids, ARRAY[]::text[]);

  -- 7. カード決済注文（売上集計用）
  SELECT
    COALESCE(sum(amount), 0),
    count(*)
  INTO v_square_revenue, v_square_order_count
  FROM orders
  WHERE tenant_id = p_tenant_id
    AND payment_method = 'credit_card'
    AND paid_at >= p_start_iso
    AND paid_at < p_end_iso;

  -- カード決済の詳細データ（商品別・日別用）
  SELECT COALESCE(jsonb_agg(jsonb_build_object(
    'amount', amount,
    'patient_id', patient_id,
    'product_code', product_code,
    'paid_at', paid_at
  )), '[]'::jsonb)
  INTO v_square_orders
  FROM orders
  WHERE tenant_id = p_tenant_id
    AND payment_method = 'credit_card'
    AND paid_at >= p_start_iso
    AND paid_at < p_end_iso;

  -- 8. 銀行振込注文
  SELECT
    COALESCE(sum(amount), 0),
    count(*)
  INTO v_bt_revenue, v_bt_order_count
  FROM orders
  WHERE tenant_id = p_tenant_id
    AND payment_method = 'bank_transfer'
    AND status IN ('pending_confirmation', 'confirmed')
    AND created_at >= p_start_iso
    AND created_at < p_end_iso;

  -- 銀行振込の詳細データ
  SELECT COALESCE(jsonb_agg(jsonb_build_object(
    'amount', amount,
    'patient_id', patient_id,
    'product_code', product_code,
    'created_at', created_at
  )), '[]'::jsonb)
  INTO v_bt_orders
  FROM orders
  WHERE tenant_id = p_tenant_id
    AND payment_method = 'bank_transfer'
    AND status IN ('pending_confirmation', 'confirmed')
    AND created_at >= p_start_iso
    AND created_at < p_end_iso;

  -- 9. 返金データ
  SELECT
    COALESCE(sum(COALESCE(refunded_amount, amount)), 0),
    count(*)
  INTO v_total_refunded, v_refund_count
  FROM orders
  WHERE tenant_id = p_tenant_id
    AND refund_status = 'COMPLETED'
    AND refunded_at >= p_start_iso
    AND refunded_at < p_end_iso;

  -- 売上集計
  v_gross_revenue := v_square_revenue + v_bt_revenue;
  v_order_count := v_square_order_count + v_bt_order_count;
  v_total_revenue := v_gross_revenue - v_total_refunded;
  IF v_order_count > 0 THEN
    v_avg_order_amount := round(v_gross_revenue::numeric / v_order_count);
  ELSE
    v_avg_order_amount := 0;
  END IF;

  -- 10. 総患者数（intake数）
  SELECT count(*) INTO v_total_patients
  FROM intake
  WHERE tenant_id = p_tenant_id;

  -- 11. 銀行振込（入金待ち）
  SELECT count(*) INTO v_pending_bt
  FROM orders
  WHERE tenant_id = p_tenant_id
    AND payment_method = 'bank_transfer'
    AND status = 'pending_confirmation'
    AND created_at >= p_start_iso
    AND created_at < p_end_iso;

  -- 12. 銀行振込（確認済み）
  SELECT count(*) INTO v_confirmed_bt
  FROM orders
  WHERE tenant_id = p_tenant_id
    AND payment_method = 'bank_transfer'
    AND status = 'confirmed'
    AND created_at >= p_start_iso
    AND created_at < p_end_iso;

  -- 13. 診察完了患者ID（KPI用）
  SELECT array_agg(DISTINCT patient_id) INTO v_consulted_patient_ids
  FROM intake
  WHERE tenant_id = p_tenant_id
    AND status IN ('OK', 'NG')
    AND created_at >= p_start_iso
    AND created_at < p_end_iso
    AND patient_id IS NOT NULL;
  v_consulted_patient_ids := COALESCE(v_consulted_patient_ids, ARRAY[]::text[]);
  v_consulted_count := COALESCE(array_length(v_consulted_patient_ids, 1), 0);

  -- 14. 問診患者ID（KPI用 + 新規患者数兼用）
  SELECT array_agg(patient_id) INTO v_intake_patient_ids
  FROM intake
  WHERE tenant_id = p_tenant_id
    AND created_at >= p_start_iso
    AND created_at < p_end_iso;
  v_intake_patient_ids := COALESCE(v_intake_patient_ids, ARRAY[]::text[]);
  v_new_patients := COALESCE(array_length(v_intake_patient_ids, 1), 0);
  -- ユニーク版（KPI用）
  v_intake_count := (SELECT count(DISTINCT pid) FROM unnest(v_intake_patient_ids) AS pid WHERE pid IS NOT NULL);

  -- 15. LINE登録者数
  SELECT COALESCE(followers, 0) INTO v_line_followers
  FROM line_daily_stats
  WHERE tenant_id = p_tenant_id
  ORDER BY stat_date DESC
  LIMIT 1;
  v_line_followers := COALESCE(v_line_followers, 0);

  -- 16. アクティブ予約数
  SELECT count(*) INTO v_today_active_reservations
  FROM reservations
  WHERE tenant_id = p_tenant_id
    AND reserved_date >= p_reservation_start_date
    AND reserved_date < p_reservation_end_date
    AND status != 'canceled';

  -- 17. 本日作成予約数
  SELECT count(*) INTO v_today_new_reservations
  FROM reservations
  WHERE tenant_id = p_tenant_id
    AND created_at >= p_start_iso
    AND created_at < p_end_iso;

  -- 18-19. 前期間の顧客ID（リピート率計算用）
  SELECT array_agg(DISTINCT patient_id) INTO v_prev_period_patient_ids
  FROM orders
  WHERE tenant_id = p_tenant_id
    AND patient_id IS NOT NULL
    AND (
      (payment_method = 'credit_card' AND paid_at IS NOT NULL AND paid_at >= p_prev_start_iso AND paid_at < p_prev_end_iso)
      OR
      (payment_method = 'bank_transfer' AND status IN ('pending_confirmation', 'confirmed') AND created_at >= p_prev_start_iso AND created_at < p_prev_end_iso)
    );
  v_prev_period_patient_ids := COALESCE(v_prev_period_patient_ids, ARRAY[]::text[]);

  -- 20. 不通（intake.call_status = no_answer / no_answer_sent、診察済みを除く）
  SELECT array_agg(r.patient_id) INTO v_no_answer_ids
  FROM reservations r
  JOIN intake i ON i.reserve_id = r.reserve_id AND i.tenant_id = p_tenant_id
  WHERE r.tenant_id = p_tenant_id
    AND r.reserved_date >= p_reservation_start_date
    AND r.reserved_date < p_reservation_end_date
    AND i.call_status IN ('no_answer', 'no_answer_sent')
    AND r.status NOT IN ('OK', 'NG', 'canceled');
  v_no_answer_ids := COALESCE(v_no_answer_ids, ARRAY[]::text[]);
  v_no_answer_count := COALESCE(array_length(v_no_answer_ids, 1), 0);

  -- ============================================================
  -- バッチ2: バッチ1の結果に依存するクエリ
  -- ============================================================

  -- 当期間の全決済患者ID
  SELECT array_agg(DISTINCT patient_id) INTO v_paid_patient_ids
  FROM orders
  WHERE tenant_id = p_tenant_id
    AND patient_id IS NOT NULL
    AND (
      (payment_method = 'credit_card' AND paid_at >= p_start_iso AND paid_at < p_end_iso)
      OR
      (payment_method = 'bank_transfer' AND status IN ('pending_confirmation', 'confirmed') AND created_at >= p_start_iso AND created_at < p_end_iso)
    );
  v_paid_patient_ids := COALESCE(v_paid_patient_ids, ARRAY[]::text[]);
  v_total_unique_patients := COALESCE(array_length(v_paid_patient_ids, 1), 0);
  v_active_patients := v_total_unique_patients;
  v_today_paid_count := v_total_unique_patients;

  -- 当期間の決済患者IDセットを使用してリピート率を計算
  SELECT count(*) INTO v_repeat_patient_count
  FROM unnest(v_prev_period_patient_ids) AS prev_pid
  WHERE prev_pid = ANY(v_paid_patient_ids);

  IF COALESCE(array_length(v_prev_period_patient_ids, 1), 0) > 0 THEN
    v_repeat_rate := round((v_repeat_patient_count::numeric / array_length(v_prev_period_patient_ids, 1)) * 100);
  ELSE
    v_repeat_rate := 0;
  END IF;

  -- 配送: 過去に注文がある患者を特定
  v_shipping_first := 0;
  v_shipping_reorder := 0;
  IF COALESCE(array_length(v_shipping_patient_ids, 1), 0) > 0 THEN
    SELECT count(DISTINCT patient_id) INTO v_shipping_reorder
    FROM orders
    WHERE tenant_id = p_tenant_id
      AND patient_id = ANY(v_shipping_patient_ids)
      AND shipping_date IS NOT NULL
      AND shipping_date < p_shipping_start_date;

    -- 配送first = 配送注文の患者数 - リピート配送患者数
    -- ただし元のコードはorder単位（patient_idがnullの注文は除外）
    v_shipping_first := (
      SELECT count(*) FROM orders
      WHERE tenant_id = p_tenant_id
        AND shipping_date >= p_shipping_start_date
        AND shipping_date < p_shipping_end_date
        AND patient_id IS NOT NULL
    ) - (
      SELECT count(*) FROM orders o
      WHERE o.tenant_id = p_tenant_id
        AND o.shipping_date >= p_shipping_start_date
        AND o.shipping_date < p_shipping_end_date
        AND o.patient_id IS NOT NULL
        AND EXISTS (
          SELECT 1 FROM orders o2
          WHERE o2.tenant_id = p_tenant_id
            AND o2.patient_id = o.patient_id
            AND o2.shipping_date IS NOT NULL
            AND o2.shipping_date < p_shipping_start_date
        )
    );
    v_shipping_reorder := (
      SELECT count(*) FROM orders o
      WHERE o.tenant_id = p_tenant_id
        AND o.shipping_date >= p_shipping_start_date
        AND o.shipping_date < p_shipping_end_date
        AND o.patient_id IS NOT NULL
        AND EXISTS (
          SELECT 1 FROM orders o2
          WHERE o2.tenant_id = p_tenant_id
            AND o2.patient_id = o.patient_id
            AND o2.shipping_date IS NOT NULL
            AND o2.shipping_date < p_shipping_start_date
        )
    );
  END IF;

  -- 再処方注文数（当期間の注文のうち過去にも注文歴がある患者の注文）
  SELECT array_agg(DISTINCT patient_id) INTO v_prev_paid_patient_ids
  FROM orders
  WHERE tenant_id = p_tenant_id
    AND patient_id = ANY(v_paid_patient_ids)
    AND paid_at IS NOT NULL
    AND paid_at < p_start_iso;
  v_prev_paid_patient_ids := COALESCE(v_prev_paid_patient_ids, ARRAY[]::text[]);

  -- 再処方注文数を数える（元コードはorder単位でカウント）
  SELECT count(*) INTO v_reorder_order_count
  FROM (
    SELECT patient_id FROM orders
    WHERE tenant_id = p_tenant_id
      AND payment_method = 'credit_card'
      AND paid_at >= p_start_iso AND paid_at < p_end_iso
      AND patient_id = ANY(v_prev_paid_patient_ids)
    UNION ALL
    SELECT patient_id FROM orders
    WHERE tenant_id = p_tenant_id
      AND payment_method = 'bank_transfer'
      AND status IN ('pending_confirmation', 'confirmed')
      AND created_at >= p_start_iso AND created_at < p_end_iso
      AND patient_id = ANY(v_prev_paid_patient_ids)
  ) sub;

  -- KPI: 診察完了患者のうち決済した患者
  IF v_consulted_count > 0 THEN
    SELECT count(DISTINCT patient_id) INTO v_paid_patient_count
    FROM orders
    WHERE tenant_id = p_tenant_id
      AND patient_id = ANY(v_consulted_patient_ids)
      AND paid_at IS NOT NULL
      AND paid_at >= p_start_iso
      AND paid_at < p_end_iso;
    v_payment_rate_after_consultation := round((v_paid_patient_count::numeric / v_consulted_count) * 100);
  ELSE
    v_paid_patient_count := 0;
    v_payment_rate_after_consultation := 0;
  END IF;

  -- KPI: 問診患者のうち予約した患者
  IF v_intake_count > 0 THEN
    SELECT count(DISTINCT patient_id) INTO v_reserved_patient_count
    FROM reservations
    WHERE tenant_id = p_tenant_id
      AND patient_id = ANY(v_intake_patient_ids)
      AND reserved_date >= p_reservation_start_date
      AND reserved_date < p_reservation_end_date;
    v_reservation_rate_after_intake := round((v_reserved_patient_count::numeric / v_intake_count) * 100);
  ELSE
    v_reserved_patient_count := 0;
    v_reservation_rate_after_intake := 0;
  END IF;

  -- KPI: 予約後の受診率
  v_non_cancelled_reservations := v_total_reservations - v_cancelled_reservations;
  IF v_non_cancelled_reservations > 0 THEN
    v_consultation_completion_rate := round((v_completed_reservations::numeric / v_non_cancelled_reservations) * 100);
  ELSE
    v_consultation_completion_rate := 0;
  END IF;

  -- ============================================================
  -- 商品別集計
  -- ============================================================
  SELECT COALESCE(jsonb_agg(
    jsonb_build_object(
      'code', sub.product_code,
      'name', sub.product_code,
      'count', sub.cnt,
      'revenue', sub.rev
    ) ORDER BY sub.rev DESC
  ), '[]'::jsonb)
  INTO v_products
  FROM (
    SELECT product_code, count(*) AS cnt, COALESCE(sum(amount), 0) AS rev
    FROM orders
    WHERE tenant_id = p_tenant_id
      AND (
        (payment_method = 'credit_card' AND paid_at >= p_start_iso AND paid_at < p_end_iso)
        OR
        (payment_method = 'bank_transfer' AND status IN ('pending_confirmation', 'confirmed') AND created_at >= p_start_iso AND created_at < p_end_iso)
      )
    GROUP BY product_code
  ) sub;

  -- ============================================================
  -- 結果をJSONBで組み立て
  -- ============================================================
  result := jsonb_build_object(
    'reservations', jsonb_build_object(
      'total', v_total_reservations,
      'completed', v_completed_reservations,
      'cancelled', v_cancelled_reservations,
      'cancelRate', v_cancel_rate,
      'consultationCompletionRate', v_consultation_completion_rate
    ),
    'shipping', jsonb_build_object(
      'total', v_shipping_total,
      'first', v_shipping_first,
      'reorder', v_shipping_reorder
    ),
    'revenue', jsonb_build_object(
      'square', v_square_revenue,
      'bankTransfer', v_bt_revenue,
      'gross', v_gross_revenue,
      'refunded', v_total_refunded,
      'refundCount', v_refund_count,
      'total', v_total_revenue,
      'avgOrderAmount', v_avg_order_amount,
      'totalOrders', v_order_count,
      'reorderOrders', v_reorder_order_count
    ),
    'products', v_products,
    'patients', jsonb_build_object(
      'total', v_total_patients,
      'active', v_active_patients,
      'new', v_new_patients,
      'repeatRate', v_repeat_rate,
      'repeatPatients', v_repeat_patient_count,
      'totalOrderPatients', v_total_unique_patients,
      'prevPeriodPatients', COALESCE(array_length(v_prev_period_patient_ids, 1), 0)
    ),
    'bankTransfer', jsonb_build_object(
      'pending', v_pending_bt,
      'confirmed', v_confirmed_bt
    ),
    'kpi', jsonb_build_object(
      'paymentRateAfterConsultation', v_payment_rate_after_consultation,
      'reservationRateAfterIntake', v_reservation_rate_after_intake,
      'consultationCompletionRate', v_consultation_completion_rate,
      'lineRegisteredCount', v_line_followers,
      'todayActiveReservations', v_today_active_reservations,
      'todayActiveOK', v_completed_ok_count,
      'todayActiveNG', v_completed_ng_count,
      'todayNoAnswer', v_no_answer_count,
      'todayNewReservations', v_today_new_reservations,
      'todayPaidCount', v_today_paid_count
    ),
    'squareOrders', v_square_orders,
    'btOrders', v_bt_orders,
    'prevPaidPatientIds', to_jsonb(v_prev_paid_patient_ids)
  );

  RETURN result;
END;
$$;
