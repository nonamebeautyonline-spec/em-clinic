-- 予約機能拡張マイグレーション
-- 1. reservation_settings: テナント別予約設定
-- 2. reservation_slots: 予約枠
-- 3. reservation_courses: コース
-- 4. slot_course_links: 予約枠×コース紐づけ
-- 5. reservations テーブルに slot_id, course_id 追加
-- 6. followup_rules/followup_logs 拡張（テーブルが存在する場合のみ）

-- ============================================
-- 1. reservation_settings（テナント別予約設定、1テナント1レコード）
-- ============================================
CREATE TABLE IF NOT EXISTS reservation_settings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID UNIQUE,

  -- 変更・キャンセル期限（0=無制限=現行どおり）
  change_deadline_hours INTEGER NOT NULL DEFAULT 0,
  cancel_deadline_hours INTEGER NOT NULL DEFAULT 0,

  -- 受付期間（0=制限なし=現行どおり）
  booking_start_days_before INTEGER NOT NULL DEFAULT 60,
  booking_deadline_hours_before INTEGER NOT NULL DEFAULT 0,

  -- 翌月予約開放日（毎月N日に翌月の予約を自動開放）
  booking_open_day INTEGER NOT NULL DEFAULT 5,

  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE reservation_settings ENABLE ROW LEVEL SECURITY;
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'reservation_settings' AND policyname = 'service_role_full_access') THEN
    CREATE POLICY service_role_full_access ON reservation_settings FOR ALL USING (auth.role() = 'service_role');
  END IF;
END $$;

-- ============================================
-- 2. reservation_slots（予約枠）
-- ============================================
CREATE TABLE IF NOT EXISTS reservation_slots (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  duration_minutes INTEGER NOT NULL DEFAULT 15,
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_reservation_slots_tenant ON reservation_slots (tenant_id, sort_order);

ALTER TABLE reservation_slots ENABLE ROW LEVEL SECURITY;
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'reservation_slots' AND policyname = 'service_role_full_access') THEN
    CREATE POLICY service_role_full_access ON reservation_slots FOR ALL USING (auth.role() = 'service_role');
  END IF;
END $$;

-- ============================================
-- 3. reservation_courses（コース）
-- ============================================
CREATE TABLE IF NOT EXISTS reservation_courses (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL,
  title TEXT NOT NULL,
  duration_minutes INTEGER NOT NULL DEFAULT 15,
  description TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_reservation_courses_tenant ON reservation_courses (tenant_id, sort_order);

ALTER TABLE reservation_courses ENABLE ROW LEVEL SECURITY;
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'reservation_courses' AND policyname = 'service_role_full_access') THEN
    CREATE POLICY service_role_full_access ON reservation_courses FOR ALL USING (auth.role() = 'service_role');
  END IF;
END $$;

-- ============================================
-- 4. slot_course_links（予約枠×コース紐づけ）
-- ============================================
CREATE TABLE IF NOT EXISTS slot_course_links (
  slot_id UUID NOT NULL REFERENCES reservation_slots(id) ON DELETE CASCADE,
  course_id UUID NOT NULL REFERENCES reservation_courses(id) ON DELETE CASCADE,
  PRIMARY KEY (slot_id, course_id)
);

ALTER TABLE slot_course_links ENABLE ROW LEVEL SECURITY;
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'slot_course_links' AND policyname = 'service_role_full_access') THEN
    CREATE POLICY service_role_full_access ON slot_course_links FOR ALL USING (auth.role() = 'service_role');
  END IF;
END $$;

-- ============================================
-- 5. reservations テーブルに slot_id, course_id 追加
-- ============================================
ALTER TABLE reservations ADD COLUMN IF NOT EXISTS slot_id UUID REFERENCES reservation_slots(id);
ALTER TABLE reservations ADD COLUMN IF NOT EXISTS course_id UUID REFERENCES reservation_courses(id);

-- ============================================
-- 6. followup_rules 拡張（来院後フォロー対応）
-- テーブルが存在する場合のみ実行
-- ============================================
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'followup_rules') THEN
    ALTER TABLE followup_rules ADD COLUMN IF NOT EXISTS delay_hours INTEGER;
    -- 既存データ移行: delay_days * 24 → delay_hours
    UPDATE followup_rules SET delay_hours = delay_days * 24 WHERE delay_hours IS NULL AND delay_days IS NOT NULL;
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'followup_logs') THEN
    ALTER TABLE followup_logs ADD COLUMN IF NOT EXISTS reservation_id TEXT;
    CREATE INDEX IF NOT EXISTS idx_followup_logs_reservation ON followup_logs (reservation_id);
  END IF;
END $$;
