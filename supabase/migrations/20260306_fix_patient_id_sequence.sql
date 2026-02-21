-- patient_id_seq を正しい開始値に修正
-- 初回デプロイ時にLENGTHフィルタで日付ベースIDを除外してしまったため、
-- 実際の最大値に合わせてSEQUENCEをリセット

DO $$
DECLARE max_id BIGINT;
BEGIN
  -- 全数値 patient_id の最大値を取得
  SELECT COALESCE(MAX(patient_id::BIGINT), 10000) INTO max_id
  FROM patients WHERE patient_id ~ '^\d+$';

  -- SEQUENCE の現在値を更新（max_id + 1 から再開）
  PERFORM setval('patient_id_seq', max_id);
  RAISE NOTICE 'patient_id_seq reset to %', max_id;
END $$;
