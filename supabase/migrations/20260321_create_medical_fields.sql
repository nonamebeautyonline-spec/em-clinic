-- medical_fields テーブル: 診療分野マスタ（メディカルダイエット、美容内服、AGA等）
CREATE TABLE medical_fields (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  slug TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  icon_url TEXT,
  color_theme TEXT DEFAULT 'emerald',
  sort_order INT DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(tenant_id, slug)
);

ALTER TABLE medical_fields ENABLE ROW LEVEL SECURITY;
CREATE POLICY service_role_full_access ON medical_fields
  FOR ALL USING (auth.role() = 'service_role');

CREATE INDEX idx_medical_fields_tenant ON medical_fields(tenant_id);

-- 既存テーブルに field_id カラム追加（全てNULL許容、後方互換）

ALTER TABLE intake ADD COLUMN field_id UUID REFERENCES medical_fields(id) ON DELETE SET NULL;
CREATE INDEX idx_intake_field_id ON intake(field_id);

ALTER TABLE intake_form_definitions ADD COLUMN field_id UUID REFERENCES medical_fields(id) ON DELETE SET NULL;
CREATE INDEX idx_intake_form_defs_field_id ON intake_form_definitions(field_id);

ALTER TABLE products ADD COLUMN field_id UUID REFERENCES medical_fields(id) ON DELETE SET NULL;
CREATE INDEX idx_products_field_id ON products(field_id);

ALTER TABLE reservations ADD COLUMN field_id UUID REFERENCES medical_fields(id) ON DELETE SET NULL;
CREATE INDEX idx_reservations_field_id ON reservations(field_id);

ALTER TABLE reorders ADD COLUMN field_id UUID REFERENCES medical_fields(id) ON DELETE SET NULL;
CREATE INDEX idx_reorders_field_id ON reorders(field_id);

ALTER TABLE orders ADD COLUMN field_id UUID REFERENCES medical_fields(id) ON DELETE SET NULL;
CREATE INDEX idx_orders_field_id ON orders(field_id);

-- 各テナントにデフォルト分野「メディカルダイエット」を作成し、既存データに field_id を付与
DO $$
DECLARE
  t RECORD;
  default_field_id UUID;
BEGIN
  FOR t IN SELECT id FROM tenants LOOP
    INSERT INTO medical_fields (tenant_id, slug, name, description, sort_order)
    VALUES (t.id, 'medical_diet', 'メディカルダイエット', 'GLP-1受容体作動薬によるメディカルダイエット', 1)
    ON CONFLICT (tenant_id, slug) DO NOTHING
    RETURNING id INTO default_field_id;

    -- RETURNING が NULL の場合（既にある）は SELECT で取得
    IF default_field_id IS NULL THEN
      SELECT id INTO default_field_id FROM medical_fields
      WHERE tenant_id = t.id AND slug = 'medical_diet';
    END IF;

    -- 既存データに field_id を一括設定
    UPDATE intake SET field_id = default_field_id
    WHERE tenant_id = t.id AND field_id IS NULL;

    UPDATE intake_form_definitions SET field_id = default_field_id
    WHERE tenant_id = t.id AND field_id IS NULL;

    UPDATE products SET field_id = default_field_id
    WHERE tenant_id = t.id AND field_id IS NULL;

    UPDATE reservations SET field_id = default_field_id
    WHERE tenant_id = t.id AND field_id IS NULL;

    UPDATE reorders SET field_id = default_field_id
    WHERE tenant_id = t.id AND field_id IS NULL;

    UPDATE orders SET field_id = default_field_id
    WHERE tenant_id = t.id AND field_id IS NULL;
  END LOOP;
END $$;
