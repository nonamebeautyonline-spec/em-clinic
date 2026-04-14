-- 予約RPC関数: type='closed' の休診overrideチェック追加
-- 問題: 休診設定されている医師・日付への予約作成・変更がブロックされていなかった
-- 原因: RPC関数が type IN ('open','modify') のみ参照し、'closed' を無視していた

-- 1. create_reservation_atomic: 休診チェック追加
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
  v_is_closed BOOLEAN;
BEGIN
  v_weekday := EXTRACT(DOW FROM p_reserved_date);

  -- ★ 休診チェック: type='closed' の override があれば予約拒否
  SELECT EXISTS(
    SELECT 1 FROM doctor_date_overrides
    WHERE doctor_id = p_doctor_id
      AND date = p_reserved_date
      AND type = 'closed'
      AND (p_tenant_id IS NULL OR tenant_id = p_tenant_id)
  ) INTO v_is_closed;

  IF v_is_closed THEN
    RETURN jsonb_build_object(
      'ok', false,
      'error', 'doctor_closed',
      'message', 'この医師は指定日は休診です'
    );
  END IF;

  -- オーバーライド（日別例外）から定員を取得
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

  -- 週間ルールから定員を取得
  IF v_capacity IS NULL THEN
    SELECT capacity INTO v_capacity
    FROM doctor_weekly_rules
    WHERE doctor_id = p_doctor_id
      AND weekday = v_weekday
      AND enabled = true;
  END IF;

  -- デフォルト定員
  IF v_capacity IS NULL THEN
    v_capacity := 2;
  END IF;

  -- 同一医師・同一日時の予約数をカウント（排他ロック）
  SELECT COUNT(*) INTO v_booked_count
  FROM (
    SELECT 1 FROM reservations
    WHERE reserved_date = p_reserved_date
      AND reserved_time = p_reserved_time::time
      AND doctor_id = p_doctor_id
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
    note, prescription_menu, doctor_id, tenant_id
  ) VALUES (
    p_reserve_id, p_patient_id, p_patient_name,
    p_reserved_date, p_reserved_time::time, 'pending',
    NULL, NULL, p_doctor_id, p_tenant_id
  );

  RETURN jsonb_build_object(
    'ok', true,
    'reserve_id', p_reserve_id,
    'booked', v_booked_count + 1,
    'capacity', v_capacity
  );
END;
$$
SET search_path = 'public';

-- 2. update_reservation_atomic: 休診チェック追加 + doctor_id更新対応
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
  v_existing RECORD;
  v_is_closed BOOLEAN;
BEGIN
  SELECT * INTO v_existing
  FROM reservations
  WHERE reserve_id = p_reserve_id
    AND status != 'canceled'
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'error', 'not_found');
  END IF;

  -- ★ 休診チェック: type='closed' の override があれば変更拒否
  SELECT EXISTS(
    SELECT 1 FROM doctor_date_overrides
    WHERE doctor_id = p_doctor_id
      AND date = p_new_date
      AND type = 'closed'
      AND (p_tenant_id IS NULL OR tenant_id = p_tenant_id)
  ) INTO v_is_closed;

  IF v_is_closed THEN
    RETURN jsonb_build_object(
      'ok', false,
      'error', 'doctor_closed',
      'message', 'この医師は指定日は休診です'
    );
  END IF;

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
      AND doctor_id = p_doctor_id
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

  -- ★ doctor_id も更新（変更先日の担当医師に合わせる）
  UPDATE reservations
  SET reserved_date = p_new_date,
      reserved_time = p_new_time::time,
      doctor_id = p_doctor_id,
      updated_at = NOW()
  WHERE reserve_id = p_reserve_id;

  RETURN jsonb_build_object(
    'ok', true,
    'reserve_id', p_reserve_id,
    'booked', v_booked_count + 1,
    'capacity', v_capacity
  );
END;
$$
SET search_path = 'public';
