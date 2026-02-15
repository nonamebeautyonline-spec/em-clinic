-- テナント管理テーブル
CREATE TABLE IF NOT EXISTS tenants (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  slug TEXT UNIQUE NOT NULL,          -- サブドメイン用 ({slug}.lope.jp)
  name TEXT NOT NULL,                 -- クリニック表示名
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- テナントメンバー（管理者の所属）
CREATE TABLE IF NOT EXISTS tenant_members (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  admin_user_id UUID NOT NULL REFERENCES admin_users(id),
  role TEXT DEFAULT 'admin',          -- admin / owner
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(tenant_id, admin_user_id)
);

-- インデックス
CREATE INDEX IF NOT EXISTS idx_tenants_slug ON tenants(slug);
CREATE INDEX IF NOT EXISTS idx_tenant_members_tenant_id ON tenant_members(tenant_id);
CREATE INDEX IF NOT EXISTS idx_tenant_members_admin_user_id ON tenant_members(admin_user_id);
