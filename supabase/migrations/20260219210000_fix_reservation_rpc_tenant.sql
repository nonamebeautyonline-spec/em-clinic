-- 予約RPCにテナントID対応を追加（緊急修正）
-- 問題: RPCがtenant_id NULLで予約を作成し、表示と不整合を起こしていた

-- create_reservation_atomic: テナントフィルタ + INSERT時にtenant_id設定
CREATE OR REPLACE FUNCTION create_reservation_atomic(
  p_reserve_id TEXT,
  p_patient_id TEXT,
  p_patient_name TEXT,
  p_reserved_date DATE,
  p_reserved_time TEXT,
  p_doctor_id TEXT DEFAULT 'dr_default',
  p_tenant_id UUID DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
AS $$
DECLARE
  v_weekday INTEGER;
  v_capacity INTEGER;
  v_booked_count INTEGER;
BEGIN
  v_weekday := EXTRACT(DOW FROM p_reserved_date);

  SELECT capacity INTO v_capacity
  FROM doctor_date_overrides
  WHERE doctor_id = p_doctor_id
    AND date = p_reserved_date
    AND type IN ('open', 'modify')
    AND capacity IS NOT NULL
    AND start_time IS NOT NULL
    AND end_time IS NOT NULL
    AND p_reserved_time::time >= start_time
    AND p_reserved_time::time < end_time
  ORDER BY start_time
  LIMIT 1;

  IF v_capacity IS NULL THEN
    SELECT capacity INTO v_capacity
    FROM doctor_weekly_rules
    WHERE doctor_id = p_doctor_id
      AND weekday = v_weekday
      AND enabled = true;
  END IF;

  IF v_capacity IS NULL THEN
    v_capacity := 2;
  END IF;

  SELECT COUNT(*) INTO v_booked_count
  FROM (
    SELECT 1 FROM reservations
    WHERE reserved_date = p_reserved_date
      AND reserved_time = p_reserved_time::time
      AND status != 'canceled'
      AND (p_tenant_id IS NULL OR tenant_id = p_tenant_id)
    FOR UPDATE
  ) locked;

  IF v_booked_count >= v_capacity THEN
    RETURN jsonb_build_object(
      'ok', false,
      'error', 'slot_full',
      'booked', v_booked_count,
      'capacity', v_capacity
    );
  END IF;

  INSERT INTO reservations (
    reserve_id, patient_id, patient_name,
    reserved_date, reserved_time, status,
    note, prescription_menu, tenant_id
  ) VALUES (
    p_reserve_id, p_patient_id, p_patient_name,
    p_reserved_date, p_reserved_time::time, 'pending',
    NULL, NULL, p_tenant_id
  );

  RETURN jsonb_build_object(
    'ok', true,
    'reserve_id', p_reserve_id,
    'booked', v_booked_count + 1,
    'capacity', v_capacity
  );
END;
$$;
