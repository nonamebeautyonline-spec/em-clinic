-- update_reservation_atomic: テナントフィルタ追加
CREATE OR REPLACE FUNCTION update_reservation_atomic(
  p_reserve_id TEXT,
  p_new_date DATE,
  p_new_time TEXT,
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
  v_weekday := EXTRACT(DOW FROM p_new_date);

  SELECT capacity INTO v_capacity
  FROM doctor_date_overrides
  WHERE doctor_id = p_doctor_id
    AND date = p_new_date
    AND type IN ('open', 'modify')
    AND capacity IS NOT NULL
    AND start_time IS NOT NULL
    AND end_time IS NOT NULL
    AND p_new_time::time >= start_time
    AND p_new_time::time < end_time
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
    WHERE reserved_date = p_new_date
      AND reserved_time = p_new_time::time
      AND status != 'canceled'
      AND reserve_id != p_reserve_id
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

  UPDATE reservations
  SET reserved_date = p_new_date,
      reserved_time = p_new_time::time
  WHERE reserve_id = p_reserve_id;

  RETURN jsonb_build_object(
    'ok', true,
    'reserve_id', p_reserve_id,
    'booked', v_booked_count + 1,
    'capacity', v_capacity
  );
END;
$$;
