-- exec_readonly_query RPC — AIセグメントクエリの実行用
-- SELECT文のみ許可する読み取り専用クエリ実行関数
-- 実行: node scripts/run-sql.js supabase/migrations/20260401_exec_readonly_query_rpc.sql

CREATE OR REPLACE FUNCTION exec_readonly_query(query_text TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  result JSONB;
BEGIN
  -- SELECT文のみ許可
  IF NOT (UPPER(TRIM(query_text)) LIKE 'SELECT%') THEN
    RAISE EXCEPTION 'SELECT文のみ許可されています';
  END IF;

  EXECUTE 'SELECT COALESCE(jsonb_agg(row_to_json(t)), ''[]''::jsonb) FROM (' || query_text || ') t'
    INTO result;

  RETURN COALESCE(result, '[]'::jsonb);
END;
$$;
