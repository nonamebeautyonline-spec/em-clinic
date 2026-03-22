-- パンフレット閲覧用アクセスコード管理テーブル
CREATE TABLE IF NOT EXISTS pamphlet_codes (
  id          bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  tenant_id   uuid NOT NULL DEFAULT '00000000-0000-0000-0000-000000000001',
  code        text NOT NULL,
  label       text NOT NULL DEFAULT '',          -- 申込者名・会社名など識別ラベル
  expires_at  timestamptz,                       -- NULL = 無期限
  used_count  int NOT NULL DEFAULT 0,            -- 閲覧回数カウント
  last_used_at timestamptz,
  is_active   boolean NOT NULL DEFAULT true,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);

-- コード検索用ユニークインデックス（テナント×コード）
CREATE UNIQUE INDEX IF NOT EXISTS pamphlet_codes_tenant_code_idx
  ON pamphlet_codes (tenant_id, code);

-- RLS
ALTER TABLE pamphlet_codes ENABLE ROW LEVEL SECURITY;

CREATE POLICY service_role_full_access ON pamphlet_codes
  FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');
