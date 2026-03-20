-- ロール×メニュー単位のカスタム権限テーブル
-- 管理者/副管理者は全権限のため、editor/viewer のみ対象
CREATE TABLE IF NOT EXISTS role_menu_permissions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  role TEXT NOT NULL,              -- editor / viewer
  menu_key TEXT NOT NULL,          -- メニュー項目キー
  can_edit BOOLEAN DEFAULT false,  -- true=編集可, false=閲覧のみ
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(tenant_id, role, menu_key)
);

ALTER TABLE role_menu_permissions ENABLE ROW LEVEL SECURITY;
CREATE POLICY service_role_full_access ON role_menu_permissions
  FOR ALL USING (auth.role() = 'service_role');
CREATE INDEX idx_rmp_tenant_role ON role_menu_permissions(tenant_id, role);

-- 既存データ移行: 三井→管理者(owner), 髙林→副管理者(admin)
UPDATE tenant_members SET role = 'owner'
WHERE admin_user_id IN (SELECT id FROM admin_users WHERE name = '三井')
  AND tenant_id = '00000000-0000-0000-0000-000000000001';

UPDATE tenant_members SET role = 'admin'
WHERE admin_user_id IN (SELECT id FROM admin_users WHERE name = '髙林')
  AND tenant_id = '00000000-0000-0000-0000-000000000001';
