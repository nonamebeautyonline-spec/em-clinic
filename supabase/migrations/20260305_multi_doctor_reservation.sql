-- 複数医師並列予約対応マイグレーション
-- 1. doctors テーブル拡張
-- 2. RPC関数修正: booked count に doctor_id フィルタ追加 + INSERT に doctor_id 含める
-- 3. インデックス追加

-- 1. doctors テーブル拡張
ALTER TABLE doctors ADD COLUMN IF NOT EXISTS specialties TEXT[] DEFAULT '{}';
ALTER TABLE doctors ADD COLUMN IF NOT EXISTS photo_url TEXT;
ALTER TABLE doctors ADD COLUMN IF NOT EXISTS bio TEXT;
ALTER TABLE doctors ADD COLUMN IF NOT EXISTS display_in_booking BOOLEAN NOT NULL DEFAULT true;

-- 2. RPC関数修正: create_reservation_atomic
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

  -- ★ 修正: doctor_id フィルタを追加（医師別に定員チェック）
  SELECT COUNT(*) INTO v_booked_count
  FROM (
    SELECT 1 FROM reservations
    WHERE reserved_date = p_reserved_date
      AND reserved_time = p_reserved_time::time
      AND status != 'canceled'
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

  -- ★ 修正: INSERT に doctor_id を含める
  INSERT INTO reservations (
    reserve_id, patient_id, patient_name,
    reserved_date, reserved_time, status,
    doctor_id, note, prescription_menu, tenant_id
  ) VALUES (
    p_reserve_id, p_patient_id, p_patient_name,
    p_reserved_date, p_reserved_time::time, 'pending',
    p_doctor_id, NULL, NULL, p_tenant_id
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

-- 3. update_reservation_atomic にも同様の修正
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
BEGIN
  SELECT * INTO v_existing
  FROM reservations
  WHERE reserve_id = p_reserve_id
    AND status != 'canceled'
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'error', 'not_found');
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

  -- ★ 修正: doctor_id フィルタを追加（医師別に定員チェック）
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

  UPDATE reservations
  SET reserved_date = p_new_date,
      reserved_time = p_new_time::time,
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

-- 4. インデックス追加（医師×日時の検索高速化）
CREATE INDEX IF NOT EXISTS idx_reservations_doctor_date_time
  ON reservations (doctor_id, reserved_date, reserved_time)
  WHERE status != 'canceled';
