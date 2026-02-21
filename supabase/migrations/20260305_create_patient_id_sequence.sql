-- patient_id 採番用 SEQUENCE + RPC
-- 既存の MAX+1 方式はレースコンディションに弱いため、PostgreSQL SEQUENCE で一意性を保証
--
-- 使い方: SELECT next_patient_id();  → '10042' のようなテキスト値を返す

-- 現在のMAXに合わせてSEQUENCE作成
DO $$
DECLARE max_id BIGINT;
BEGIN
  -- 全数値 patient_id の最大値を取得（日付ベースIDも含む）
  SELECT COALESCE(MAX(patient_id::BIGINT), 10000) INTO max_id
  FROM patients WHERE patient_id ~ '^\d+$';

  -- SEQUENCE が既に存在する場合はスキップ
  IF NOT EXISTS (SELECT 1 FROM pg_sequences WHERE schemaname = 'public' AND sequencename = 'patient_id_seq') THEN
    EXECUTE format('CREATE SEQUENCE patient_id_seq START WITH %s INCREMENT BY 1', max_id + 1);
    RAISE NOTICE 'patient_id_seq created with START = %', max_id + 1;
  ELSE
    RAISE NOTICE 'patient_id_seq already exists, skipping';
  END IF;
END $$;

-- 採番関数（アプリから supabaseAdmin.rpc("next_patient_id") で呼び出す）
CREATE OR REPLACE FUNCTION next_patient_id()
RETURNS TEXT
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN nextval('patient_id_seq')::TEXT;
END;
$$;
