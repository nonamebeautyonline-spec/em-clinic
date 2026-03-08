-- product_categories テーブル（商品フォルダ管理）
CREATE TABLE product_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES tenants(id),
  name TEXT NOT NULL,
  parent_id UUID REFERENCES product_categories(id) ON DELETE CASCADE,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE product_categories ENABLE ROW LEVEL SECURITY;

CREATE POLICY service_role_full_access ON product_categories
  FOR ALL USING (auth.role() = 'service_role');

CREATE INDEX idx_product_categories_tenant ON product_categories(tenant_id);
CREATE INDEX idx_product_categories_parent ON product_categories(parent_id);

-- products に category_id 追加（フォルダ所属）
ALTER TABLE products ADD COLUMN IF NOT EXISTS category_id UUID
  REFERENCES product_categories(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_products_category_id ON products(category_id);
