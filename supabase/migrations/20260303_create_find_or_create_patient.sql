-- 患者検索・作成のアトミック関数
-- create_reservation_atomic と同じ設計パターン
--
-- 同時に follow イベントが来ても、同一 LINE UID で2つ目の患者レコードは作られない
-- ON CONFLICT DO NOTHING + 再検索 でレースコンディションを完全に排除
--
-- 使い方: SELECT find_or_create_patient('U1234567890abcdef', 'テスト太郎', null, null);
-- 返り値: {"ok": true, "patient_id": "LINE_cdef1234", "patient_name": "テスト太郎", "created": true}

CREATE OR REPLACE FUNCTION find_or_create_patient(
  p_line_uid TEXT,
  p_display_name TEXT DEFAULT NULL,
  p_picture_url TEXT DEFAULT NULL,
  p_tenant_id UUID DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
AS $$
DECLARE
  v_patient RECORD;
  v_patient_id TEXT;
  v_sentinel UUID := '00000000-0000-0000-0000-000000000000'::uuid;
BEGIN
  -- 1. 正規患者を検索（LINE_以外を優先）
  SELECT patient_id, name
  INTO v_patient
  FROM patients
  WHERE line_id = p_line_uid
    AND COALESCE(tenant_id, v_sentinel) = COALESCE(p_tenant_id, v_sentinel)
    AND NOT patient_id LIKE 'LINE_%'
  LIMIT 1;

  IF FOUND THEN
    RETURN jsonb_build_object(
      'ok', true,
      'patient_id', v_patient.patient_id,
      'patient_name', COALESCE(v_patient.name, ''),
      'created', false
    );
  END IF;

  -- 2. LINE_仮レコードを検索
  SELECT patient_id, name
  INTO v_patient
  FROM patients
  WHERE line_id = p_line_uid
    AND COALESCE(tenant_id, v_sentinel) = COALESCE(p_tenant_id, v_sentinel)
  LIMIT 1;

  IF FOUND THEN
    RETURN jsonb_build_object(
      'ok', true,
      'patient_id', v_patient.patient_id,
      'patient_name', COALESCE(v_patient.name, ''),
      'created', false
    );
  END IF;

  -- 3. 新規作成
  v_patient_id := 'LINE_' || RIGHT(p_line_uid, 8);

  -- ON CONFLICT DO NOTHING でレースコンディション対処
  -- idx_patients_tenant_line_id_unique または patient_id UNIQUE が効く
  INSERT INTO patients (patient_id, line_id, line_display_name, line_picture_url, tenant_id)
  VALUES (v_patient_id, p_line_uid, p_display_name, p_picture_url, p_tenant_id)
  ON CONFLICT DO NOTHING;

  IF NOT FOUND THEN
    -- 他のリクエストが先に作成した → 再検索
    SELECT patient_id, name
    INTO v_patient
    FROM patients
    WHERE line_id = p_line_uid
      AND COALESCE(tenant_id, v_sentinel) = COALESCE(p_tenant_id, v_sentinel)
    LIMIT 1;

    IF FOUND THEN
      RETURN jsonb_build_object(
        'ok', true,
        'patient_id', v_patient.patient_id,
        'patient_name', COALESCE(v_patient.name, ''),
        'created', false
      );
    END IF;

    -- ここに到達することは通常ない
    RETURN jsonb_build_object('ok', false, 'error', 'insert_failed');
  END IF;

  -- intake も同時作成（ON CONFLICT で重複防止）
  INSERT INTO intake (patient_id, tenant_id)
  VALUES (v_patient_id, p_tenant_id)
  ON CONFLICT DO NOTHING;

  RETURN jsonb_build_object(
    'ok', true,
    'patient_id', v_patient_id,
    'patient_name', COALESCE(p_display_name, 'LINE_' || RIGHT(p_line_uid, 6)),
    'created', true
  );
END;
$$;
