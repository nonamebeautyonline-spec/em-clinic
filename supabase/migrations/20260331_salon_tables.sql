-- SALON特化テーブル

-- スタイリスト
CREATE TABLE IF NOT EXISTS stylists (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  display_name TEXT,
  photo_url TEXT,
  specialties TEXT[] DEFAULT '{}',
  sort_order INT DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_stylists_tenant ON stylists(tenant_id);
ALTER TABLE stylists ENABLE ROW LEVEL SECURITY;
CREATE POLICY service_role_full_access ON stylists FOR ALL USING (auth.role() = 'service_role');

-- スタイリストシフト
CREATE TABLE IF NOT EXISTS stylist_shifts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  stylist_id UUID NOT NULL REFERENCES stylists(id) ON DELETE CASCADE,
  day_of_week INT CHECK (day_of_week >= 0 AND day_of_week <= 6),
  specific_date DATE,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  is_available BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_stylist_shifts_stylist ON stylist_shifts(stylist_id);
ALTER TABLE stylist_shifts ENABLE ROW LEVEL SECURITY;
CREATE POLICY service_role_full_access ON stylist_shifts FOR ALL USING (auth.role() = 'service_role');

-- 施術カテゴリ
CREATE TABLE IF NOT EXISTS treatment_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  sort_order INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_treatment_categories_tenant ON treatment_categories(tenant_id);
ALTER TABLE treatment_categories ENABLE ROW LEVEL SECURITY;
CREATE POLICY service_role_full_access ON treatment_categories FOR ALL USING (auth.role() = 'service_role');

-- 施術メニュー
CREATE TABLE IF NOT EXISTS treatment_menus (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  category_id UUID REFERENCES treatment_categories(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  duration_min INT NOT NULL,
  price INT NOT NULL,
  description TEXT,
  photo_url TEXT,
  is_active BOOLEAN DEFAULT true,
  sort_order INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_treatment_menus_tenant ON treatment_menus(tenant_id);
ALTER TABLE treatment_menus ENABLE ROW LEVEL SECURITY;
CREATE POLICY service_role_full_access ON treatment_menus FOR ALL USING (auth.role() = 'service_role');

-- 施術カルテ（来店記録）
CREATE TABLE IF NOT EXISTS salon_visits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  patient_id BIGINT NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  stylist_id UUID REFERENCES stylists(id) ON DELETE SET NULL,
  visit_date DATE NOT NULL,
  menu_items JSONB DEFAULT '[]',
  total_amount INT DEFAULT 0,
  payment_method TEXT DEFAULT 'cash',
  notes TEXT,
  photo_urls TEXT[] DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_salon_visits_tenant ON salon_visits(tenant_id);
CREATE INDEX IF NOT EXISTS idx_salon_visits_patient ON salon_visits(patient_id);
CREATE INDEX IF NOT EXISTS idx_salon_visits_date ON salon_visits(visit_date);
ALTER TABLE salon_visits ENABLE ROW LEVEL SECURITY;
CREATE POLICY service_role_full_access ON salon_visits FOR ALL USING (auth.role() = 'service_role');

-- スタンプカード
CREATE TABLE IF NOT EXISTS stamp_cards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  patient_id BIGINT NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  current_stamps INT DEFAULT 0,
  completed_count INT DEFAULT 0,
  last_stamp_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(tenant_id, patient_id)
);
CREATE INDEX IF NOT EXISTS idx_stamp_cards_tenant ON stamp_cards(tenant_id);
ALTER TABLE stamp_cards ENABLE ROW LEVEL SECURITY;
CREATE POLICY service_role_full_access ON stamp_cards FOR ALL USING (auth.role() = 'service_role');

-- スタンプカード設定
CREATE TABLE IF NOT EXISTS stamp_card_settings (
  tenant_id UUID PRIMARY KEY REFERENCES tenants(id) ON DELETE CASCADE,
  stamps_required INT DEFAULT 10,
  reward_type TEXT DEFAULT 'coupon',
  reward_config JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE stamp_card_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY service_role_full_access ON stamp_card_settings FOR ALL USING (auth.role() = 'service_role');
